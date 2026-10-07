-- Phase 13: WhatsApp enquiries, reviews, contact messages and website jobs.
--
-- 1. WhatsApp: the browser makes the HW-WA reference at the moment of the tap
--    (so WhatsApp opens without waiting for a server), and the enquiry row is
--    saved with that same reference.
-- 2. Reviews: every order gets a private review link (an unguessable token).
--    The link shows the order's products once it's delivered and accepts one
--    review per product, held for approval.
-- 3. Website jobs: pg_cron starts a run, gives it a one-time ticket and calls
--    the website (pg_net). The website claims the ticket, does the work and
--    reports back, so every run's real outcome lands in job_runs. No shared
--    secret is stored anywhere: a ticket works once, for one job, for 15 minutes.
-- 4. Contact messages from the website's contact form.
-- 5. Admins can update sample requests and basket reminders (posting samples,
--    marking a reminder sent or done).

-- 1. WhatsApp enquiries ------------------------------------------------------

create or replace function public.create_whatsapp_enquiry(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attr jsonb := coalesce(p_input->'attribution', '{}'::jsonb);
  v_given text := upper(btrim(coalesce(p_input->>'reference', '')));
  v_ref text;
begin
  insert into public.whatsapp_enquiries (
    reference,
    visitor_id, session_id, arrival_id, page_url, page_context,
    product_id, variant_id, product_name,
    gclid, gbraid, wbraid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    ga_client_id, meta_fbp, meta_fbc, is_test
  )
  values (
    case when v_given ~ '^HW-WA-[0-9]{6}-[A-Z0-9]{6}$'
      then v_given
      else 'HW-WA-' || to_char((now() at time zone 'Europe/London'), 'YYMMDD') || '-' || public.random_code(6)
    end,
    public.try_uuid(v_attr->>'visitor_id'), public.try_uuid(v_attr->>'session_id'), public.try_uuid(v_attr->>'arrival_id'),
    public.clean_text(p_input->>'page_url', 500), public.clean_text(p_input->>'page_context', 60),
    (select p.id from public.products p where p.id = public.try_uuid(p_input->>'product_id')),
    (select v.id from public.product_variants v where v.id = public.try_uuid(p_input->>'variant_id')),
    public.clean_text(p_input->>'product_name', 200),
    public.clean_text(v_attr->>'gclid', 300), public.clean_text(v_attr->>'gbraid', 300),
    public.clean_text(v_attr->>'wbraid', 300), public.clean_text(v_attr->>'fbclid', 500),
    public.clean_text(v_attr->>'utm_source', 200), public.clean_text(v_attr->>'utm_medium', 200),
    public.clean_text(v_attr->>'utm_campaign', 200), public.clean_text(v_attr->>'utm_content', 200),
    public.clean_text(v_attr->>'utm_term', 200),
    public.clean_text(v_attr->>'ga_client_id', 100), public.clean_text(v_attr->>'meta_fbp', 200),
    public.clean_text(v_attr->>'meta_fbc', 500),
    coalesce((p_input->>'is_test') = 'true', false)
  )
  -- A repeated tap on the same button sends the same reference: keep the first row.
  on conflict (reference) do nothing
  returning reference into v_ref;

  return jsonb_build_object('reference', coalesce(v_ref, v_given), 'duplicate', v_ref is null);
end;
$$;

-- 2. Reviews -------------------------------------------------------------------

alter table public.orders add column review_token uuid not null default gen_random_uuid();
create unique index orders_review_token_key on public.orders (review_token);

-- Reviews written from a test order are marked, so they're easy to spot.
alter table public.reviews add column is_test boolean not null default false;

-- What a review link shows: the order's products, each with whether it's reviewed.
create function private.review_invite(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where review_token = p_token;
  if not found then
    return jsonb_build_object('outcome', 'invalid');
  end if;
  if v_order.status <> 'delivered' then
    return jsonb_build_object('outcome', 'not_delivered');
  end if;
  return jsonb_build_object(
    'outcome', 'ok',
    'reference', v_order.reference,
    'first_name', split_part(btrim(v_order.customer_name), ' ', 1),
    'suggested_name', btrim(split_part(btrim(v_order.customer_name), ' ', 1) || ' ' ||
      coalesce(nullif(left(split_part(btrim(v_order.customer_name), ' ', 2), 1), '') || '.', '')),
    'products', coalesce((
      select jsonb_agg(x.item order by x.position)
      from (
        select distinct on (oi.product_id) oi.position, jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'slug', p.slug,
          'image', coalesce(v.image_url, p.gallery_images[1]),
          'reviewed', exists (select 1 from public.reviews r where r.order_id = v_order.id and r.product_id = p.id)
        ) as item
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        left join public.product_variants v on v.id = oi.variant_id
        where oi.order_id = v_order.id
        order by oi.product_id, oi.position
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- One review per product per delivered order, held until an admin approves it.
create function private.submit_review(p_token uuid, p_product_id uuid, p_rating integer, p_title text, p_comment text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_id uuid;
begin
  select * into v_order from public.orders where review_token = p_token;
  if not found then
    raise exception 'INVALID_LINK' using errcode = 'no_data_found';
  end if;
  if v_order.status <> 'delivered' then
    raise exception 'NOT_DELIVERED' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.order_items where order_id = v_order.id and product_id = p_product_id) then
    raise exception 'NOT_IN_ORDER' using errcode = 'check_violation';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'BAD_RATING' using errcode = 'check_violation';
  end if;

  insert into public.reviews (product_id, order_id, customer_name, rating, title, comment, is_approved, is_test)
  values (
    p_product_id,
    v_order.id,
    coalesce(public.clean_text(p_name, 80), split_part(btrim(v_order.customer_name), ' ', 1)),
    p_rating,
    public.clean_text(p_title, 120),
    nullif(btrim(left(coalesce(p_comment, ''), 2000)), ''),
    false,
    v_order.is_test
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id);
exception
  when unique_violation then
    raise exception 'ALREADY_REVIEWED' using errcode = 'unique_violation';
end;
$$;

-- Asking now, from the order page (staff): the same details the daily job uses.
create function private.admin_review_request(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.require_admin();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.status <> 'delivered' then
    raise exception 'NOT_DELIVERED' using errcode = 'check_violation';
  end if;
  if v_order.customer_email is null then
    raise exception 'NO_EMAIL' using errcode = 'check_violation';
  end if;
  update public.orders set review_request_sent_at = now() where id = p_order_id;
  return private.review_request_row(p_order_id);
end;
$$;

-- One order's review-request email details.
create function private.review_request_row(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_id', o.id,
    'reference', o.reference,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'review_token', o.review_token,
    'is_test', o.is_test,
    'products', coalesce((
      select jsonb_agg(x.item order by x.position)
      from (
        select distinct on (oi.product_id) oi.position,
          jsonb_build_object('title', p.title, 'image', coalesce(v.image_url, p.gallery_images[1])) as item
        from public.order_items oi
        join public.products p on p.id = oi.product_id
        left join public.product_variants v on v.id = oi.variant_id
        where oi.order_id = o.id
        order by oi.product_id, oi.position
      ) x
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

-- 3. Website jobs ----------------------------------------------------------------

-- Per-project settings for the jobs: the website address they call. Set per
-- project after this migration (staging and production call different sites).
create table private.app_config (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{2,40}$'),
  value text not null,
  updated_at timestamptz not null default now()
);
revoke all on table private.app_config from public, anon, authenticated;

alter table public.job_runs add column ticket uuid;
create unique index job_runs_ticket_key on public.job_runs (ticket) where ticket is not null;

-- Called by pg_cron: start a run and ask the website to do it.
create function private.start_site_job(p_job text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := (select value from private.app_config where key = 'site_url');
  v_id bigint;
  v_ticket uuid := gen_random_uuid();
begin
  -- A run the website never reported back on counts as failed.
  update public.job_runs
  set status = 'failed', finished_at = now(), ticket = null,
      error = 'The website didn’t report back within 30 minutes'
  where job = p_job and status = 'running' and started_at < now() - interval '30 minutes';

  if v_url is null then
    insert into public.job_runs (job, status, finished_at, error)
    values (p_job, 'skipped', now(), 'No website address is set for scheduled jobs in this project')
    returning id into v_id;
    return v_id;
  end if;

  insert into public.job_runs (job, ticket) values (p_job, v_ticket) returning id into v_id;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/jobs/' || p_job,
    body := jsonb_build_object('job', p_job, 'run', v_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_ticket::text),
    timeout_milliseconds := 55000
  );
  return v_id;
end;
$$;

-- Called by the website: claim the ticket (once, within 15 minutes, for that job).
create function private.job_claim(p_ticket uuid, p_job text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  update public.job_runs
  set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object('claimed_at', now())
  where ticket = p_ticket
    and job = p_job
    and status = 'running'
    and started_at > now() - interval '15 minutes'
    and not (coalesce(detail, '{}'::jsonb) ? 'claimed_at')
  returning id into v_id;
  return jsonb_build_object('ok', v_id is not null, 'run', v_id);
end;
$$;

-- Called by the website when it's done.
create function private.job_finish(p_ticket uuid, p_status text, p_detail jsonb, p_error text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_status not in ('ok', 'failed', 'skipped') then
    raise exception 'BAD_STATUS' using errcode = 'check_violation';
  end if;
  update public.job_runs
  set status = p_status,
      finished_at = now(),
      detail = coalesce(detail, '{}'::jsonb) || coalesce(p_detail, '{}'::jsonb),
      error = nullif(left(p_error, 1000), ''),
      ticket = null
  where ticket = p_ticket and status = 'running' and coalesce(detail, '{}'::jsonb) ? 'claimed_at'
  returning id into v_id;
  return jsonb_build_object('ok', v_id is not null);
end;
$$;

-- The review-request job's batch: orders delivered three or more days ago (and
-- no more than 30), not yet asked. Each is stamped as asked before it's
-- returned, so a failed send never turns into a daily repeat.
create function private.review_requests_due(p_ticket uuid, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  if not exists (
    select 1 from public.job_runs
    where ticket = p_ticket and job = 'review-requests' and status = 'running' and detail ? 'claimed_at'
  ) then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  with due as (
    select id from public.orders
    where status = 'delivered'
      and review_request_sent_at is null
      and customer_email is not null
      and delivered_at <= now() - interval '3 days'
      and delivered_at > now() - interval '30 days'
    order by delivered_at
    limit least(greatest(coalesce(p_limit, 10), 1), 25)
    for update skip locked
  ), stamped as (
    update public.orders o set review_request_sent_at = now()
    from due where o.id = due.id
    returning o.id
  )
  select array_agg(id) into v_ids from stamped;

  return coalesce((select jsonb_agg(private.review_request_row(i)) from unnest(v_ids) i), '[]'::jsonb);
end;
$$;

select cron.schedule('heartwell-review-requests', '0 9 * * *', $$select private.start_site_job('review-requests')$$);

-- 4. Contact messages ------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(btrim(name)) between 2 and 120),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  phone text check (phone is null or length(phone) <= 30),
  topic text not null default 'other' check (topic in ('before', 'order', 'delivery', 'after', 'other')),
  order_reference text check (order_reference is null or length(order_reference) <= 20),
  message text not null check (length(btrim(message)) between 2 and 4000),
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  replied_at timestamptz,
  visitor_id uuid,
  customer_ip text,
  customer_user_agent text,
  is_test boolean not null default false
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from anon, authenticated;
grant select, update on table public.contact_messages to authenticated;
create policy "admins read contact messages" on public.contact_messages for select to authenticated
  using ((select private.is_admin()));
create policy "admins update contact messages" on public.contact_messages for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- 5. Admin updates for samples and basket reminders ------------------------------

grant update on table public.sample_requests, public.basket_reminder_leads to authenticated;
create policy "admins update sample requests" on public.sample_requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins update basket reminders" on public.basket_reminder_leads for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Daily clean-up: as before, plus contact messages closed over two years ago.
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
    delete from public.job_runs where started_at < now() - interval '90 days' and id <> v_run;
    get diagnostics v_runs = row_count;
    delete from orderflow.push_log where pushed_at < now() - interval '30 days';
    get diagnostics v_pushes = row_count;

    v_detail := jsonb_build_object(
      'expired_leads', v_leads, 'cleared_leads', v_cleared,
      'old_actions', v_actions, 'old_sessions', v_sessions,
      'old_messages', v_messages, 'old_job_runs', v_runs, 'old_pushes', v_pushes
    );
    update public.job_runs set finished_at = now(), status = 'ok', detail = v_detail where id = v_run;
    return v_detail;
  exception when others then
    update public.job_runs set finished_at = now(), status = 'failed', error = sqlerrm where id = v_run;
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$$;

-- Wrappers and grants ---------------------------------------------------------------

create function public.review_invite(p_token uuid)
returns jsonb language sql stable set search_path = ''
as $$ select private.review_invite(p_token) $$;

create function public.submit_review(p_token uuid, p_product_id uuid, p_rating integer, p_title text, p_comment text, p_name text)
returns jsonb language sql set search_path = ''
as $$ select private.submit_review(p_token, p_product_id, p_rating, p_title, p_comment, p_name) $$;

create function public.admin_review_request(p_order_id uuid)
returns jsonb language sql set search_path = ''
as $$ select private.admin_review_request(p_order_id) $$;

create function public.job_claim(p_ticket uuid, p_job text)
returns jsonb language sql set search_path = ''
as $$ select private.job_claim(p_ticket, p_job) $$;

create function public.job_finish(p_ticket uuid, p_status text, p_detail jsonb, p_error text)
returns jsonb language sql set search_path = ''
as $$ select private.job_finish(p_ticket, p_status, p_detail, p_error) $$;

create function public.review_requests_due(p_ticket uuid, p_limit integer)
returns jsonb language sql set search_path = ''
as $$ select private.review_requests_due(p_ticket, p_limit) $$;

revoke all on function
  private.review_invite(uuid), private.submit_review(uuid, uuid, integer, text, text, text),
  private.admin_review_request(uuid), private.review_request_row(uuid),
  private.start_site_job(text), private.job_claim(uuid, text), private.job_finish(uuid, text, jsonb, text),
  private.review_requests_due(uuid, integer),
  public.review_invite(uuid), public.submit_review(uuid, uuid, integer, text, text, text),
  public.admin_review_request(uuid), public.job_claim(uuid, text), public.job_finish(uuid, text, jsonb, text),
  public.review_requests_due(uuid, integer)
from public, anon, authenticated;

-- Gated by an unguessable token or ticket, so the website can call them with
-- its public key (no secret key needed for reviews or jobs).
grant execute on function
  private.review_invite(uuid), private.submit_review(uuid, uuid, integer, text, text, text),
  private.job_claim(uuid, text), private.job_finish(uuid, text, jsonb, text),
  private.review_requests_due(uuid, integer),
  public.review_invite(uuid), public.submit_review(uuid, uuid, integer, text, text, text),
  public.job_claim(uuid, text), public.job_finish(uuid, text, jsonb, text),
  public.review_requests_due(uuid, integer)
to anon, authenticated, service_role;
-- review_request_row (emails and review links) is only ever called from inside
-- the functions above, which run as their owner: nobody else may call it.

-- Staff only (checked inside with require_admin()).
grant execute on function private.admin_review_request(uuid), public.admin_review_request(uuid) to authenticated, service_role;
