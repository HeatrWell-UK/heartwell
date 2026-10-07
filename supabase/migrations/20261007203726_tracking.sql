-- Phase 14: Meta and GA4 tracking.
--
-- 1. Settings: the tracking mode (dry run, Meta test events, live), whether a
--    confirmed order's Purchase goes automatically after a hold or waits for
--    staff, and the hold in minutes.
-- 2. The conversion outbox fills itself: Purchase (Meta) and purchase (GA4)
--    when an order is confirmed, OrderDelivered (Meta) when it's delivered.
--    Cancelling skips whatever hasn't gone. One row per order, platform and
--    event (the existing unique key), so nothing is ever sent twice.
-- 3. A website job sends due rows every 5 minutes (only when there are any),
--    with the same one-time tickets as the other jobs, and reports each
--    result back: sent with Meta's reply, or failed and retried with backoff.
-- 4. tracking_log: what was built and what came back, for the admin Tracking
--    page (every dry-run and test event, and live failures). Hashed details
--    only; kept 30 days.

-- 1. Settings ----------------------------------------------------------------------

alter table public.shop_settings
  add column tracking_mode text not null default 'dry_run' check (tracking_mode in ('dry_run', 'test', 'live')),
  add column purchase_mode text not null default 'automatic' check (purchase_mode in ('automatic', 'manual')),
  add column purchase_hold_minutes smallint not null default 30 check (purchase_hold_minutes between 0 and 1440);

-- 2. Filling the outbox ------------------------------------------------------------

create function private.enqueue_conversions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
begin
  select * into s from public.shop_settings where id;

  if new.status = 'confirmed' and old.status = 'pending_cod' then
    insert into public.conversion_outbox (order_id, platform, event_name, event_id, status, send_after)
    select new.id, v.platform, v.event_name, new.purchase_event_id::text,
      -- Manual mode holds real orders for staff; test orders always flow (they never go live).
      case when s.purchase_mode = 'manual' and not new.is_test then 'held' else 'pending' end,
      now() + make_interval(mins => case when new.is_test then 0 else s.purchase_hold_minutes end)
    from (values ('meta', 'Purchase'), ('ga4', 'purchase')) as v(platform, event_name)
    on conflict (order_id, platform, event_name) do nothing;
  elsif new.status = 'delivered' and old.status is distinct from 'delivered' then
    insert into public.conversion_outbox (order_id, platform, event_name, event_id, status, send_after)
    values (new.id, 'meta', 'OrderDelivered', 'delivered-' || new.purchase_event_id::text, 'pending', now())
    on conflict (order_id, platform, event_name) do nothing;
  elsif new.status = 'cancelled' then
    update public.conversion_outbox
    set status = 'skipped', skip_reason = 'order cancelled', lease_until = null
    where order_id = new.id and status in ('pending', 'held', 'failed');
  end if;
  return null;
end;
$$;

create trigger orders_enqueue_conversions
after update of status on public.orders
for each row when (old.status is distinct from new.status)
execute function private.enqueue_conversions();

-- 3. Sending -----------------------------------------------------------------------

create or replace function private.ticket_ok(p_ticket uuid, p_job text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.job_runs
    where ticket = p_ticket and job = p_job and status = 'running' and detail ? 'claimed_at'
  );
$$;

-- Claim due rows (a 10-minute lease) and return them with the order details the
-- website needs to build each event. Up to 6 attempts per row.
create function private.conversions_due(p_ticket uuid, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  if not private.ticket_ok(p_ticket, 'conversions') then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  with due as (
    select id from public.conversion_outbox
    where status in ('pending', 'failed') and send_after <= now() and attempts < 6
    order by send_after
    limit least(greatest(coalesce(p_limit, 25), 1), 50)
    for update skip locked
  ), claimed as (
    update public.conversion_outbox c
    set status = 'sending', attempts = c.attempts + 1, lease_until = now() + interval '10 minutes', last_attempt_at = now()
    from due where c.id = due.id
    returning c.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'platform', c.platform,
    'event_name', c.event_name,
    'event_id', c.event_id,
    'attempts', c.attempts,
    'order', (
      select jsonb_build_object(
        'is_test', o.is_test,
        'status', o.status,
        'source', o.source,
        'created_at', o.created_at,
        'confirmed_at', o.confirmed_at,
        'delivered_at', o.delivered_at,
        'total_amount', o.total_amount,
        'customer_email', o.customer_email,
        'customer_phone', o.customer_phone,
        'customer_name', o.customer_name,
        'postcode', o.postcode,
        'tracking_consent', o.tracking_consent,
        'customer_ip', o.customer_ip,
        'customer_user_agent', o.customer_user_agent,
        'meta_fbp', o.meta_fbp,
        'meta_fbc', o.meta_fbc,
        'visitor_id', o.visitor_id,
        'ga_client_id', o.ga_client_id,
        'items', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'variant_id', i.variant_id, 'quantity', i.quantity, 'unit_price', i.unit_price,
            'title', coalesce(i.custom_title, i.title), 'option', coalesce(i.material_name, i.colour_name)
          ) order by i.position), '[]'::jsonb)
          from public.order_items i where i.order_id = o.id
        )
      )
      from public.orders o where o.id = c.order_id
    )
  )), '[]'::jsonb)
  into v_rows
  from claimed c;

  return v_rows;
end;
$$;

-- Report results: [{ id, status: sent|failed|skipped, response, error, skip_reason, log: {...} }].
create function private.conversions_report(p_ticket uuid, p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_done integer := 0;
begin
  if not private.ticket_ok(p_ticket, 'conversions') then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_results) <> 'array' then
    raise exception 'BAD_RESULTS' using errcode = 'check_violation';
  end if;

  for r in select * from jsonb_array_elements(p_results) loop
    update public.conversion_outbox c
    set status = case when r->>'status' in ('sent', 'failed', 'skipped') then r->>'status' else 'failed' end,
        sent_at = case when r->>'status' = 'sent' then now() else c.sent_at end,
        response = r->'response',
        error = case when r->>'status' = 'failed' then coalesce(r->'error', '"unknown error"'::jsonb) else null end,
        skip_reason = case when r->>'status' = 'skipped' then left(r->>'skip_reason', 200) else c.skip_reason end,
        lease_until = null,
        -- Retries back off: 5, 20, 45, 80, 125 minutes.
        send_after = case when r->>'status' = 'failed' then now() + make_interval(mins => 5 * c.attempts * c.attempts) else c.send_after end
    where c.id = public.try_uuid(r->>'id') and c.status = 'sending';
    if found then
      v_done := v_done + 1;
      if r ? 'log' then
        insert into public.tracking_log (source, platform, event_name, event_id, mode, status, is_test, payload, response)
        values (
          'outbox',
          coalesce(r->'log'->>'platform', 'meta'),
          coalesce(r->'log'->>'event_name', 'unknown'),
          r->'log'->>'event_id',
          coalesce(r->'log'->>'mode', 'dry_run'),
          coalesce(r->'log'->>'status', 'logged'),
          coalesce((r->'log'->>'is_test')::boolean, false),
          r->'log'->'payload',
          r->'log'->'response'
        );
      end if;
    end if;
  end loop;
  return jsonb_build_object('updated', v_done);
end;
$$;

-- Every 5 minutes: hand back stale leases, and start a run only when something is due.
create function private.start_conversions_job()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversion_outbox
  set status = 'failed', lease_until = null,
      error = jsonb_build_object('message', 'The sender didn’t report back; it will be retried.')
  where status = 'sending' and lease_until < now();

  if exists (
    select 1 from public.conversion_outbox
    where status in ('pending', 'failed') and send_after <= now() and attempts < 6
  ) then
    return private.start_site_job('conversions');
  end if;
  return null;
end;
$$;

select cron.schedule('heartwell-conversions', '*/5 * * * *', $$select private.start_conversions_job()$$);

-- Staff controls on one outbox row: send now, hold, or skip.
create function private.admin_outbox_action(p_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.conversion_outbox%rowtype;
begin
  perform public.require_admin();
  select * into v_row from public.conversion_outbox where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if p_action = 'send_now' then
    if v_row.status not in ('pending', 'held', 'failed') then
      raise exception 'NOT_WAITING' using errcode = 'check_violation';
    end if;
    update public.conversion_outbox
    set status = 'pending', send_after = now(), attempts = least(attempts, 5), error = null
    where id = p_id;
    perform private.start_site_job('conversions');
  elsif p_action = 'hold' then
    if v_row.status <> 'pending' then
      raise exception 'NOT_WAITING' using errcode = 'check_violation';
    end if;
    update public.conversion_outbox set status = 'held' where id = p_id;
  elsif p_action = 'skip' then
    if v_row.status not in ('pending', 'held', 'failed') then
      raise exception 'NOT_WAITING' using errcode = 'check_violation';
    end if;
    update public.conversion_outbox set status = 'skipped', skip_reason = 'skipped by staff', lease_until = null where id = p_id;
  else
    raise exception 'BAD_ACTION' using errcode = 'check_violation';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 4. Tracking log -------------------------------------------------------------------

create table public.tracking_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('browser_mirror', 'outbox')),
  platform text not null check (platform in ('meta', 'ga4')),
  event_name text not null check (length(event_name) between 1 and 60),
  event_id text,
  mode text not null check (mode in ('dry_run', 'test', 'live')),
  status text not null check (status in ('logged', 'sent', 'failed')),
  is_test boolean not null default false,
  payload jsonb,
  response jsonb
);
create index tracking_log_created_idx on public.tracking_log (created_at desc);

alter table public.tracking_log enable row level security;
revoke all on table public.tracking_log from anon, authenticated;
grant select on table public.tracking_log to authenticated;
create policy "admins read the tracking log" on public.tracking_log for select to authenticated
  using ((select private.is_admin()));

-- Daily clean-up: as before, plus the tracking log after 30 days.
create or replace function public.run_daily_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run bigint;
  v_leads integer;
  v_cleared integer;
  v_actions integer;
  v_sessions integer;
  v_runs integer;
  v_pushes integer;
  v_messages integer;
  v_tracking integer;
  v_detail jsonb;
begin
  insert into public.job_runs (job) values ('daily-cleanup') returning id into v_run;

  begin
    -- Basket reminders expire after 90 days.
    delete from public.basket_reminder_leads where expires_at < now();
    get diagnostics v_leads = row_count;

    -- Closed leads keep no contact details.
    update public.basket_reminder_leads
    set email = null, phone = null, basket = '[]'::jsonb
    where status in ('converted', 'unsubscribed')
      and (email is not null or phone is not null or basket <> '[]'::jsonb);
    get diagnostics v_cleared = row_count;

    -- Attribution older than 26 months isn't needed for any report.
    delete from public.attribution_actions where created_at < now() - interval '26 months';
    get diagnostics v_actions = row_count;
    delete from public.attribution_sessions where last_seen_at < now() - interval '26 months';
    get diagnostics v_sessions = row_count;

    -- Contact messages, once dealt with, are kept two years.
    delete from public.contact_messages where status <> 'new' and created_at < now() - interval '24 months';
    get diagnostics v_messages = row_count;

    -- Operational logs.
    delete from public.tracking_log where created_at < now() - interval '30 days';
    get diagnostics v_tracking = row_count;
    delete from public.job_runs where started_at < now() - interval '90 days' and id <> v_run;
    get diagnostics v_runs = row_count;
    delete from orderflow.push_log where pushed_at < now() - interval '30 days';
    get diagnostics v_pushes = row_count;

    v_detail := jsonb_build_object(
      'expired_leads', v_leads, 'cleared_leads', v_cleared,
      'old_actions', v_actions, 'old_sessions', v_sessions,
      'old_messages', v_messages, 'old_tracking_log', v_tracking,
      'old_job_runs', v_runs, 'old_pushes', v_pushes
    );
    update public.job_runs set finished_at = now(), status = 'ok', detail = v_detail where id = v_run;
    return v_detail;
  exception when others then
    update public.job_runs set finished_at = now(), status = 'failed', error = sqlerrm where id = v_run;
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$$;

-- Wrappers and grants ------------------------------------------------------------------

create function public.conversions_due(p_ticket uuid, p_limit integer)
returns jsonb language sql set search_path = ''
as $$ select private.conversions_due(p_ticket, p_limit) $$;

create function public.conversions_report(p_ticket uuid, p_results jsonb)
returns jsonb language sql set search_path = ''
as $$ select private.conversions_report(p_ticket, p_results) $$;

create function public.admin_outbox_action(p_id uuid, p_action text)
returns jsonb language sql set search_path = ''
as $$ select private.admin_outbox_action(p_id, p_action) $$;

revoke all on function
  private.enqueue_conversions(), private.ticket_ok(uuid, text),
  private.conversions_due(uuid, integer), private.conversions_report(uuid, jsonb),
  private.start_conversions_job(), private.admin_outbox_action(uuid, text),
  public.conversions_due(uuid, integer), public.conversions_report(uuid, jsonb), public.admin_outbox_action(uuid, text)
from public, anon, authenticated;

-- Gated by the job's one-time ticket (the website calls them with its public key).
grant execute on function
  private.conversions_due(uuid, integer), private.conversions_report(uuid, jsonb),
  public.conversions_due(uuid, integer), public.conversions_report(uuid, jsonb)
to anon, authenticated, service_role;

-- Staff only (checked inside with require_admin()).
grant execute on function private.admin_outbox_action(uuid, text), public.admin_outbox_action(uuid, text) to authenticated, service_role;
