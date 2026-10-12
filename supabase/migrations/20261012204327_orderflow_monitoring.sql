-- Phase 17: OrderFlow ready for its key, its replies recorded and shown,
-- one status snapshot shared by the admin Health card and the hourly health
-- check (which emails when something turns red), and the Monday digest.
--
-- OrderFlow still does nothing until the owner adds orderflow_ingest_url and
-- orderflow_ingest_key to Supabase Vault and switches it on in the admin.

-- ===========================================================================
-- 1. OrderFlow
-- ===========================================================================

alter table orderflow.push_log
  add column manual boolean not null default false,
  add column status_code integer,
  add column outcome text,
  add column error text,
  add column checked_at timestamptz;

create index push_log_unchecked_idx on orderflow.push_log (pushed_at) where checked_at is null;

-- The order as OrderFlow takes it. No customer name, phone, email or address:
-- OrderFlow doesn't store them. A test order (sent only by hand, to check the
-- link) carries "TEST " in front of its reference so nobody can mistake it.
create or replace function orderflow.order_payload(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'external_id', o.id::text,
    'reference', case when o.is_test then 'TEST ' else '' end || o.reference,
    'shop', 'heartwell',
    'status', o.status,
    'placed_at', to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'postcode', o.postcode,
    'delivery_date', to_char(o.preferred_delivery_date, 'YYYY-MM-DD'),
    'total', round(o.total_amount, 2),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               -- The warehouse knows the trade name; a staff-typed name wins.
               'product_name', coalesce(oi.custom_title, oi.trade_title, oi.title),
               'sku', oi.sku,
               'variant', coalesce(oi.material_name, oi.colour_name),
               'quantity', oi.quantity,
               'unit_price', round(oi.unit_price, 2)
             )) order by oi.position, oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  ))
  from public.orders o
  where o.id = p_order_id;
$$;

-- Sends one order. Automatic pushes need OrderFlow switched on and a real
-- order; a push by hand (p_manual) only needs the Vault values, so the link
-- can be checked with a test order before switching on. Returns pg_net's
-- request ID, or null when nothing was sent.
drop function orderflow.push_order(uuid);
create function orderflow.push_order(p_order_id uuid, p_manual boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
  v_request bigint;
begin
  if not p_manual then
    if not coalesce((select s.orderflow_enabled from public.shop_settings s where s.id), false) then
      return null;
    end if;
    if coalesce((select o.is_test from public.orders o where o.id = p_order_id), true) then
      return null;
    end if;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'orderflow_ingest_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'orderflow_ingest_key';
  if v_url is null or v_key is null or not exists (select 1 from public.orders o where o.id = p_order_id) then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-orderflow-key', v_key),
    body := orderflow.order_payload(p_order_id),
    timeout_milliseconds := 10000
  ) into v_request;

  insert into orderflow.push_log (order_id, request_id, manual) values (p_order_id, v_request, p_manual);
  return v_request;
end;
$$;

-- OrderFlow answers {"ok":true,"outcome":"created"|"updated"|"ignored"}.
create function orderflow.reply_outcome(p_content text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  return left(p_content::jsonb ->> 'outcome', 40);
exception when others then
  return null;
end;
$$;

-- Copies pg_net's record of each reply onto the push log. pg_net keeps
-- replies for six hours, so a push with nothing recorded after five is
-- marked as lost (and the next re-send picks the order up again).
create function orderflow.collect_replies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update orderflow.push_log l
  set status_code = r.status_code,
      outcome = orderflow.reply_outcome(r.content),
      error = case
        when r.error_msg is not null then left(r.error_msg, 300)
        when r.timed_out then 'No reply within 10 seconds'
        when r.status_code between 200 and 299 then null
        when r.status_code = 401 then 'OrderFlow refused the key (401)'
        when r.status_code = 400 then left('OrderFlow couldn’t use the order (400): ' || coalesce(r.content, ''), 300)
        else left('HTTP ' || coalesce(r.status_code::text, '?') || ': ' || coalesce(r.content, ''), 300)
      end,
      checked_at = now()
  from net._http_response r
  where r.id = l.request_id and l.checked_at is null;
  get diagnostics n = row_count;

  update orderflow.push_log
  set checked_at = now(), error = 'No reply was recorded'
  where checked_at is null and pushed_at < now() - interval '5 hours';
  return n;
end;
$$;

-- Every 15 minutes: record replies, then re-post any order changed in the
-- last three days that OrderFlow hasn't accepted since its last change.
create or replace function orderflow.resend_recent(p_window interval default interval '3 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  r record;
  v_run bigint;
begin
  perform orderflow.collect_replies();
  if not coalesce((select s.orderflow_enabled from public.shop_settings s where s.id), false) then
    return 0;
  end if;

  insert into public.job_runs (job) values ('orderflow-resend') returning id into v_run;

  if (select count(*) from vault.decrypted_secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')) < 2 then
    update public.job_runs
    set finished_at = now(), status = 'skipped', error = 'OrderFlow’s address or key isn’t in Supabase Vault yet'
    where id = v_run;
    return 0;
  end if;

  for r in
    select o.id
    from public.orders o
    where not o.is_test
      and greatest(o.created_at, o.updated_at) > now() - p_window
      and not exists (
        select 1 from orderflow.push_log l
        where l.order_id = o.id
          and l.status_code between 200 and 299
          and l.pushed_at >= greatest(o.created_at, o.updated_at)
      )
    order by o.created_at desc
    limit 200
  loop
    begin
      if orderflow.push_order(r.id) is not null then
        n := n + 1;
      end if;
    exception when others then
      raise warning 'orderflow resend failed for order %: %', r.id, sqlerrm;
    end;
  end loop;

  update public.job_runs
  set finished_at = now(), status = 'ok', detail = jsonb_build_object('pushed', n)
  where id = v_run;
  return n;
end;
$$;

revoke all on all functions in schema orderflow from public, anon, authenticated;

-- Admin: the OrderFlow card (Settings) and the order page.
create function private.admin_orderflow()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'enabled', (select s.orderflow_enabled from public.shop_settings s where s.id),
    'configured', (select count(*) = 2 from vault.decrypted_secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')),
    'recent', coalesce((
      select jsonb_agg(x order by x.pushed_at desc)
      from (
        select l.id, l.pushed_at, l.manual, l.status_code, l.outcome, l.error, l.checked_at, o.reference, o.status, o.is_test, o.id as order_id
        from orderflow.push_log l
        join public.orders o on o.id = l.order_id
        order by l.pushed_at desc
        limit 15
      ) x
    ), '[]'::jsonb),
    'test_order', (
      select jsonb_build_object('id', o.id, 'reference', o.reference)
      from public.orders o
      where o.is_test
      order by o.created_at desc
      limit 1
    )
  );
end;
$$;

create function private.admin_orderflow_log(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(x order by x.pushed_at desc)
    from (
      select l.pushed_at, l.manual, l.status_code, l.outcome, l.error, l.checked_at
      from orderflow.push_log l
      where l.order_id = p_order_id
      order by l.pushed_at desc
      limit 5
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Send one order now, by hand (test orders too, marked TEST).
create function private.admin_orderflow_push(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request bigint;
begin
  perform public.require_admin();
  if (select count(*) from vault.decrypted_secrets where name in ('orderflow_ingest_url', 'orderflow_ingest_key')) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'not_configured');
  end if;
  v_request := orderflow.push_order(p_order_id, true);
  return jsonb_build_object('ok', v_request is not null, 'reason', case when v_request is null then 'not_found' end);
end;
$$;

-- Read a few seconds after a push by hand, to show OrderFlow's answer at once.
create function private.admin_orderflow_collect()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return orderflow.collect_replies();
end;
$$;

-- ===========================================================================
-- 2. One status snapshot, for the admin and for the health check
-- ===========================================================================

create or replace function private.status_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return jsonb_build_object(
    'database', jsonb_build_object(
      'time', now(),
      'postgres', current_setting('server_version'),
      'migrations', (select count(*) from supabase_migrations.schema_migrations),
      'latest_migration', (
        select m.version || ' ' || coalesce(m.name, '')
        from supabase_migrations.schema_migrations m
        order by m.version desc limit 1
      )
    ),
    'catalogue', jsonb_build_object(
      'products', (select count(*) from public.products),
      'active_products', (select count(*) from public.products where is_active),
      'variants', (select count(*) from public.product_variants),
      'categories', (select count(*) from public.categories),
      'materials', (select count(*) from public.materials)
    ),
    'orders', jsonb_build_object(
      'real', (select count(*) from public.orders where not is_test),
      'test', (select count(*) from public.orders where is_test),
      'awaiting_confirmation', (select count(*) from public.orders where status = 'pending_cod' and not is_test),
      'latest', (select max(created_at) from public.orders where not is_test)
    ),
    'admins', (select count(*) from public.admins where is_active),
    'settings', (select to_jsonb(s) - 'id' from public.shop_settings s where s.id),
    'cron', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', j.jobname,
        'schedule', j.schedule,
        'active', j.active,
        'last_status', d.status,
        'last_run', d.start_time,
        'last_message', left(d.return_message, 200)
      ) order by j.jobname)
      from cron.job j
      left join lateral (
        select r.status, r.start_time, r.return_message
        from cron.job_run_details r
        where r.jobid = j.jobid
        order by r.start_time desc
        limit 1
      ) d on true
    ), '[]'::jsonb),
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'job', x.job, 'status', x.status, 'started_at', x.started_at,
        'finished_at', x.finished_at, 'error', x.error
      ) order by x.job)
      from (
        select distinct on (job) job, status, started_at, finished_at, error
        from public.job_runs
        order by job, started_at desc
      ) x
    ), '[]'::jsonb),
    'email', jsonb_build_object(
      'last_sent', (select max(created_at) from public.email_log where status = 'sent'),
      'last_failed', (select max(created_at) from public.email_log where status = 'failed'),
      'failed_24h', (select count(*) from public.email_log where status = 'failed' and created_at > now() - interval '24 hours')
    ),
    'conversions', jsonb_build_object(
      'pending', (select count(*) from public.conversion_outbox where status in ('pending', 'held')),
      'failed', (select count(*) from public.conversion_outbox where status = 'failed'),
      'last_sent', (select max(sent_at) from public.conversion_outbox where status = 'sent')
    ),
    'orderflow', jsonb_build_object(
      'enabled', (select s.orderflow_enabled from public.shop_settings s where s.id),
      'configured', (
        select count(*) = 2 from vault.decrypted_secrets
        where name in ('orderflow_ingest_url', 'orderflow_ingest_key')
      ),
      'last_push', (select max(pushed_at) from orderflow.push_log),
      'last_ok', (select max(pushed_at) from orderflow.push_log where status_code between 200 and 299),
      'failed_24h', (select count(*) from orderflow.push_log where error is not null and pushed_at > now() - interval '24 hours' and not manual),
      'last_error', (select l.error from orderflow.push_log l where l.error is not null order by l.pushed_at desc limit 1)
    ),
    'feed', (
      select jsonb_build_object('last_fetched', f.last_fetched_at, 'items', f.last_items)
      from public.feed_fetches f
      where f.feed = 'meta' and f.agent = 'meta'
    )
  );
end;
$$;

create or replace function private.admin_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return private.status_data();
end;
$$;

-- ===========================================================================
-- 3. The hourly health check: the website reads the snapshot (with its
-- ticket), works out the same verdicts as the Health card, and reports the
-- red ones here. Each is emailed once, again after a day if it's still red,
-- and once more when it's fixed.
-- ===========================================================================

create table private.alerts (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  title text not null,
  summary text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  notified_at timestamptz,
  resolved_at timestamptz
);
revoke all on table private.alerts from public, anon, authenticated;

create function private.health_snapshot(p_ticket uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.ticket_ok(p_ticket, 'health-check') then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;
  return private.status_data();
end;
$$;

create function private.health_report(p_ticket uuid, p_problems jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_keys text[];
  v_notify jsonb;
  v_resolved jsonb;
begin
  if not private.ticket_ok(p_ticket, 'health-check') then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_problems) <> 'array' then
    raise exception 'BAD_INPUT' using errcode = 'check_violation';
  end if;

  select coalesce(array_agg(p ->> 'key'), '{}') into v_keys from jsonb_array_elements(p_problems) p;

  -- Fixed since last time: tell the owner if they were told it broke.
  with fixed as (
    update private.alerts a
    set resolved_at = now()
    where a.resolved_at is null and not (a.key = any (v_keys))
    returning a.key, a.title, a.notified_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'title', title)) filter (where notified_at is not null), '[]'::jsonb)
  into v_resolved
  from fixed;

  -- Still broken, or broken again.
  insert into private.alerts as a (key, title, summary)
  select p ->> 'key', left(p ->> 'title', 120), left(p ->> 'summary', 600)
  from jsonb_array_elements(p_problems) p
  where p ->> 'key' ~ '^[a-z][a-z0-9_]{1,40}$'
  on conflict (key) do update
  set title = excluded.title,
      summary = excluded.summary,
      last_seen = now(),
      first_seen = case when a.resolved_at is not null then now() else a.first_seen end,
      notified_at = case when a.resolved_at is not null then null else a.notified_at end,
      resolved_at = null;

  -- New, or still red a day after the last email.
  with due as (
    update private.alerts a
    set notified_at = now()
    where a.resolved_at is null
      and a.key = any (v_keys)
      and (a.notified_at is null or a.notified_at < now() - interval '23 hours 30 minutes')
    returning a.key, a.title, a.summary, a.first_seen
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'title', title, 'summary', summary, 'since', first_seen)), '[]'::jsonb)
  into v_notify
  from due;

  return jsonb_build_object('notify', v_notify, 'resolved', v_resolved);
end;
$$;

-- ===========================================================================
-- 4. The Monday digest: last week (Monday to Sunday, UK time), for the shop.
-- ===========================================================================

create function private.digest_data(p_ticket uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_to timestamptz := (date_trunc('week', now() at time zone 'Europe/London')) at time zone 'Europe/London';
  v_from timestamptz := v_to - interval '7 days';
  v_prev timestamptz := v_to - interval '14 days';
begin
  if not private.ticket_ok(p_ticket, 'monday-digest') then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'orders', (
      select jsonb_build_object(
        'placed', count(*) filter (where o.created_at >= v_from and o.created_at < v_to),
        'confirmed', count(*) filter (where o.confirmed_at >= v_from and o.confirmed_at < v_to),
        'confirmed_value', coalesce(sum(o.total_amount) filter (where o.confirmed_at >= v_from and o.confirmed_at < v_to), 0),
        'delivered', count(*) filter (where o.delivered_at >= v_from and o.delivered_at < v_to),
        'delivered_value', coalesce(sum(o.total_amount) filter (where o.delivered_at >= v_from and o.delivered_at < v_to), 0),
        'cancelled', count(*) filter (where o.cancelled_at >= v_from and o.cancelled_at < v_to),
        'prev_confirmed', count(*) filter (where o.confirmed_at >= v_prev and o.confirmed_at < v_from),
        'prev_confirmed_value', coalesce(sum(o.total_amount) filter (where o.confirmed_at >= v_prev and o.confirmed_at < v_from), 0),
        'awaiting_confirmation', count(*) filter (where o.status = 'pending_cod')
      )
      from public.orders o
      where not o.is_test
    ),
    'channels', coalesce((
      select jsonb_agg(x order by x.value desc, x.orders desc)
      from (
        select c.channel, c.campaign, c.ad, count(*) as orders, sum(c.total_amount) as value
        from (
          select
            case
              when o.utm_medium = 'paid_social' or o.manual_acquisition_source = 'meta' then 'Meta ads'
              when o.gclid is not null or o.utm_medium = 'cpc' or o.manual_acquisition_source = 'google' then 'Google ads'
              when o.whatsapp_reference is not null or o.source = 'whatsapp' then 'WhatsApp'
              when o.source = 'phone' then 'Phone'
              when o.utm_source is not null then 'Other links'
              else 'Direct or unknown'
            end as channel,
            o.utm_campaign as campaign,
            o.utm_content as ad,
            o.total_amount
          from public.orders o
          where not o.is_test and o.confirmed_at >= v_from and o.confirmed_at < v_to
        ) c
        group by c.channel, c.campaign, c.ad
        order by sum(c.total_amount) desc, count(*) desc
        limit 20
      ) x
    ), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'visits', (select count(*) from public.attribution_sessions s where not s.is_test and s.created_at >= v_from and s.created_at < v_to),
      'ad_visits', (select count(*) from public.attribution_sessions s where not s.is_test and s.created_at >= v_from and s.created_at < v_to and s.last_touch_medium = 'paid_social'),
      'whatsapp', (select count(*) from public.whatsapp_enquiries w where not w.is_test and w.created_at >= v_from and w.created_at < v_to),
      'samples', (select count(*) from public.sample_requests r where not r.is_test and r.created_at >= v_from and r.created_at < v_to),
      'messages', (select count(*) from public.contact_messages m where not m.is_test and m.created_at >= v_from and m.created_at < v_to),
      'reminders', (select count(*) from public.basket_reminder_leads b where not b.is_test and b.created_at >= v_from and b.created_at < v_to),
      'newsletter', (select count(*) from public.newsletter_subscribers n where n.confirmed_at >= v_from and n.confirmed_at < v_to)
    ),
    'landing', coalesce((
      select jsonb_agg(x order by x.visits desc)
      from (
        select s.landing_page as page, count(*) as visits,
               count(distinct o.id) as orders
        from public.attribution_sessions s
        left join public.orders o on o.arrival_id = s.arrival_id and not o.is_test
        where not s.is_test and s.created_at >= v_from and s.created_at < v_to and s.landing_page is not null
        group by s.landing_page
        order by count(*) desc
        limit 10
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ===========================================================================
-- 5. Wrappers, grants and schedules
-- ===========================================================================

create function public.admin_orderflow() returns jsonb language sql stable set search_path = '' as $$ select private.admin_orderflow() $$;
create function public.admin_orderflow_log(p_order_id uuid) returns jsonb language sql stable set search_path = '' as $$ select private.admin_orderflow_log(p_order_id) $$;
create function public.admin_orderflow_push(p_order_id uuid) returns jsonb language sql set search_path = '' as $$ select private.admin_orderflow_push(p_order_id) $$;
create function public.admin_orderflow_collect() returns integer language sql set search_path = '' as $$ select private.admin_orderflow_collect() $$;
create function public.health_snapshot(p_ticket uuid) returns jsonb language sql stable set search_path = '' as $$ select private.health_snapshot(p_ticket) $$;
create function public.health_report(p_ticket uuid, p_problems jsonb) returns jsonb language sql set search_path = '' as $$ select private.health_report(p_ticket, p_problems) $$;
create function public.digest_data(p_ticket uuid) returns jsonb language sql stable set search_path = '' as $$ select private.digest_data(p_ticket) $$;

revoke all on function
  private.admin_orderflow(), private.admin_orderflow_log(uuid), private.admin_orderflow_push(uuid), private.admin_orderflow_collect(),
  private.status_data(), private.health_snapshot(uuid), private.health_report(uuid, jsonb), private.digest_data(uuid),
  public.admin_orderflow(), public.admin_orderflow_log(uuid), public.admin_orderflow_push(uuid), public.admin_orderflow_collect(),
  public.health_snapshot(uuid), public.health_report(uuid, jsonb), public.digest_data(uuid)
from public, anon, authenticated;

-- Admin functions: signed-in staff (each checks require_admin itself).
grant execute on function
  private.admin_orderflow(), private.admin_orderflow_log(uuid), private.admin_orderflow_push(uuid), private.admin_orderflow_collect(),
  public.admin_orderflow(), public.admin_orderflow_log(uuid), public.admin_orderflow_push(uuid), public.admin_orderflow_collect()
to authenticated, service_role;

-- Ticket-gated job functions: the website calls them with the publishable key, like job_claim.
grant execute on function
  private.health_snapshot(uuid), private.health_report(uuid, jsonb), private.digest_data(uuid),
  public.health_snapshot(uuid), public.health_report(uuid, jsonb), public.digest_data(uuid)
to anon, authenticated, service_role;

select cron.schedule('heartwell-health-check', '7 * * * *', $$select private.start_site_job('health-check')$$);
select cron.schedule('heartwell-monday-digest', '0 7 * * 1', $$select private.start_site_job('monday-digest')$$);
