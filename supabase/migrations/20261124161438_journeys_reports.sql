-- Run 3 (24 November 2026): Journeys and Website reports.
--
-- Journey events are the shop's own analytics, kept in attribution_actions as
-- action_type 'journey_event' with metadata.data_class 'consented_journey'.
-- They are written only by /api/journey with the visitor's ANALYTICS consent,
-- never sent to Meta or Google, and hold whitelisted codes only: no names,
-- phone numbers, emails, postcodes, typed text or query strings (the route
-- checks every field; this migration adds the database's own limits).
-- Reports are admin-only security-definer RPCs; session keys are one-way
-- hashes, so no raw IDs or tokens leave the database. Test traffic is excluded.
-- Journey events are kept 90 days (the visit records stay 26 months).

-- 1. Storage rules -----------------------------------------------------------------------------

-- One row per browser event: the browser's own event ID makes a resend harmless.
create unique index if not exists attribution_actions_journey_event_id_key
  on public.attribution_actions ((metadata->>'event_id'))
  where action_type = 'journey_event';

-- A journey row may carry only these keys, with short code values.
create or replace function private.journey_metadata_ok(m jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select m is not null
    and jsonb_typeof(m) = 'object'
    and m->>'data_class' = 'consented_journey'
    and (m->>'event_id') ~ '^[0-9a-f-]{36}$'
    and (m->>'event') ~ '^[a-z_]{2,40}$'
    and not exists (
      select 1 from jsonb_each(m) e
      where e.key not in ('data_class','event_id','event','page_type','step','outcome','error_code','field_category','cta_position','section','option_code','destination','scroll_percent','sequence','elapsed_ms','quantity','device_class','navigation','last_event')
         or (jsonb_typeof(e.value) = 'string' and length(e.value #>> '{}') > 60)
         or jsonb_typeof(e.value) not in ('string','number')
    )
$$;

alter table public.attribution_actions drop constraint if exists attribution_actions_journey_metadata_check;
alter table public.attribution_actions
  add constraint attribution_actions_journey_metadata_check
  check (action_type <> 'journey_event' or private.journey_metadata_ok(metadata)) not valid;

-- 2. Classifiers (pure) ------------------------------------------------------------------------

-- An integer from text, or null (a bad value never breaks a report).
create or replace function private.try_int(p text)
returns integer
language sql
immutable
set search_path = ''
as $$ select case when p ~ '^-?\d{1,9}$' then p::integer end $$;

-- Where a session came from, from evidence only. Dynamic Meta sources (fb, ig, msg, an) count as Meta.
create or replace function private.source_class(p_source text, p_fbclid text, p_gclid text, p_gbraid text, p_wbraid text, p_referrer text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_fbclid is not null
      or lower(coalesce(p_source, '')) in ('facebook','fb','ig','instagram','msg','messenger','an','meta','audience_network','threads','facebook_ads','fb_ads')
      or lower(coalesce(p_referrer, '')) ~ '(facebook|instagram|messenger)\.com|//(l|lm|m)\.facebook\.' then 'meta'
    when coalesce(p_gclid, p_gbraid, p_wbraid) is not null
      or lower(coalesce(p_source, '')) in ('google','youtube','gmail','google_ads')
      or lower(coalesce(p_referrer, '')) ~ '//(www\.)?google\.' then 'google'
    when nullif(p_source, '') is null and nullif(p_referrer, '') is null then 'direct'
    else 'other'
  end
$$;

-- Phone, tablet or computer from the session's device words ("iPhone, Facebook app", "Windows computer, Chrome").
create or replace function private.device_class(p_device text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_device is null or p_device = '' then 'unknown'
    when p_device ~* 'ipad|tablet' then 'tablet'
    when p_device ~* 'computer|^mac' then 'desktop'
    else 'mobile'
  end
$$;

-- 3. The event view (private; read only through the RPCs below) ---------------------------------

create or replace view private.journey_events_v1 as
select
  a.id,
  a.created_at,
  a.session_id,
  left(encode(extensions.digest(a.session_id::text || ':hw-journey', 'sha256'), 'hex'), 12) as session_key,
  a.page_url as page_path,
  a.product_id,
  a.variant_id,
  a.metadata->>'event' as event,
  a.metadata->>'page_type' as page_type,
  a.metadata->>'step' as step,
  a.metadata->>'outcome' as outcome,
  a.metadata->>'error_code' as error_code,
  a.metadata->>'field_category' as field_category,
  a.metadata->>'cta_position' as cta_position,
  a.metadata->>'option_code' as option_code,
  a.metadata->>'destination' as destination,
  a.metadata->>'last_event' as last_event,
  private.try_int(a.metadata->>'scroll_percent') as scroll_percent,
  private.try_int(a.metadata->>'sequence') as sequence,
  private.try_int(a.metadata->>'elapsed_ms') as elapsed_ms,
  coalesce(nullif(private.device_class(s.device), 'unknown'), nullif(a.metadata->>'device_class', ''), 'unknown') as device,
  case when s.id is null then 'unattributed'
       else private.source_class(s.last_touch_source, s.fbclid, s.gclid, s.gbraid, s.wbraid, s.referrer) end as source
from public.attribution_actions a
-- arrival_id is unique in attribution_sessions, so this join never fans out.
left join public.attribution_sessions s on s.arrival_id = a.arrival_id
where a.action_type = 'journey_event'
  and a.metadata->>'data_class' = 'consented_journey'
  and not a.is_test;

revoke all on private.journey_events_v1 from public, anon, authenticated;

-- 4. Admin Journeys ----------------------------------------------------------------------------

-- Distinct sessions reaching each step, in order (each step counts only sessions that also reached every earlier step).
create or replace function private.journey_funnel(p_from timestamptz, p_to timestamptz, p_device text, p_source text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with e as (
    select * from private.journey_events_v1
    where created_at >= p_from and created_at < p_to
      and (p_device is null or device = p_device)
      and (p_source is null or source = p_source)
  ), s as (
    select session_key,
      bool_or(event = 'page_view') as viewed,
      bool_or(event = 'page_view' and page_type = 'product') as product,
      bool_or(event = 'basket_add' and outcome = 'success') as basket,
      bool_or(event in ('checkout_view','checkout_step') or (event = 'page_view' and page_type = 'checkout')) as checkout,
      bool_or(event = 'field_complete') as details,
      bool_or(event = 'place_order' and outcome = 'attempted') as attempted,
      bool_or(event = 'place_order' and outcome = 'saved') as saved,
      bool_or(event = 'whatsapp_click') as whatsapp
    from e group by session_key
  )
  select jsonb_build_object(
    'sessions', count(*) filter (where viewed),
    'steps', jsonb_build_array(
      jsonb_build_object('key', 'viewed', 'label', 'Visited', 'sessions', count(*) filter (where viewed)),
      jsonb_build_object('key', 'product', 'label', 'Viewed a product', 'sessions', count(*) filter (where viewed and product)),
      jsonb_build_object('key', 'basket', 'label', 'Added to basket', 'sessions', count(*) filter (where viewed and product and basket)),
      jsonb_build_object('key', 'checkout', 'label', 'Opened checkout', 'sessions', count(*) filter (where viewed and product and basket and checkout)),
      jsonb_build_object('key', 'details', 'label', 'Filled in a detail', 'sessions', count(*) filter (where viewed and product and basket and checkout and details)),
      jsonb_build_object('key', 'attempted', 'label', 'Pressed Place order', 'sessions', count(*) filter (where viewed and product and basket and checkout and details and attempted)),
      jsonb_build_object('key', 'saved', 'label', 'Order saved', 'sessions', count(*) filter (where viewed and product and basket and checkout and details and attempted and saved))
    ),
    'whatsapp_sessions', count(*) filter (where whatsapp),
    'saved_any_path', count(*) filter (where saved)
  ) from s
$$;

create or replace function private.admin_journey_daily(p_from timestamptz, p_to timestamptz, p_device text default null, p_source text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_span interval := p_to - p_from;
  v_device text := nullif(p_device, '');
  v_source text := nullif(p_source, '');
begin
  perform public.require_admin();
  if p_from is null or p_to is null or p_to <= p_from or v_span > interval '400 days' then
    raise exception 'PERIOD' using errcode = 'check_violation';
  end if;
  return jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'funnel', private.journey_funnel(p_from, p_to, v_device, v_source),
    'prior', private.journey_funnel(p_from - v_span, p_from, v_device, v_source),
    'by_device', (
      select coalesce(jsonb_agg(jsonb_build_object('device', d, 'funnel', private.journey_funnel(p_from, p_to, d, v_source)) order by d), '[]')
      from (select distinct device d from private.journey_events_v1 where created_at >= p_from and created_at < p_to and (v_device is null or device = v_device)) x
    ),
    'by_source', (
      select coalesce(jsonb_agg(jsonb_build_object('source', src, 'funnel', private.journey_funnel(p_from, p_to, v_device, src)) order by src), '[]')
      from (select distinct source src from private.journey_events_v1 where created_at >= p_from and created_at < p_to and (v_source is null or source = v_source)) x
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'sessions', sessions, 'basket', basket, 'checkout', checkout, 'saved', saved) order by day), '[]')
      from (
        select (created_at at time zone 'Europe/London')::date as day,
          count(distinct session_key) as sessions,
          count(distinct session_key) filter (where event = 'basket_add' and outcome = 'success') as basket,
          count(distinct session_key) filter (where event in ('checkout_view','checkout_step') or (event = 'page_view' and page_type = 'checkout')) as checkout,
          count(distinct session_key) filter (where event = 'place_order' and outcome = 'saved') as saved
        from private.journey_events_v1
        where created_at >= p_from and created_at < p_to and (v_device is null or device = v_device) and (v_source is null or source = v_source)
        group by 1
      ) d
    ),
    -- Each check counted once by its outcome (the outcomes don't overlap). Checks, not people.
    'delivery_checks', (
      select coalesce(jsonb_agg(jsonb_build_object('outcome', outcome, 'checks', n, 'sessions', ns) order by n desc), '[]')
      from (
        select coalesce(outcome, 'unknown') outcome, count(*) n, count(distinct session_key) ns
        from private.journey_events_v1
        where event = 'postcode_check' and created_at >= p_from and created_at < p_to and (v_device is null or device = v_device) and (v_source is null or source = v_source)
        group by 1
      ) x
    ),
    'errors', (
      select coalesce(jsonb_agg(jsonb_build_object('field', field_category, 'error', error_code, 'events', n, 'sessions', ns) order by ns desc, n desc), '[]')
      from (
        select coalesce(field_category, 'form') field_category, coalesce(error_code, 'invalid') error_code, count(*) n, count(distinct session_key) ns
        from private.journey_events_v1
        where event in ('validation_error','basket_add','place_order') and (event = 'validation_error' or outcome = 'failed')
          and created_at >= p_from and created_at < p_to and (v_device is null or device = v_device) and (v_source is null or source = v_source)
        group by 1, 2 order by 4 desc limit 15
      ) x
    ),
    -- Where sessions that didn't save an order last were (their final event in the period).
    'exits', (
      select coalesce(jsonb_agg(jsonb_build_object('page_type', page_type, 'last_event', last_event, 'sessions', n) order by n desc), '[]')
      from (
        select coalesce(page_type, 'other') page_type, coalesce(event, 'unknown') last_event, count(*) n
        from (
          select distinct on (session_key) session_key, page_type, event
          from private.journey_events_v1
          where created_at >= p_from and created_at < p_to and (v_device is null or device = v_device) and (v_source is null or source = v_source)
            and event <> 'page_exit'
          order by session_key, created_at desc, sequence desc nulls last
        ) last
        where not exists (
          select 1 from private.journey_events_v1 j where j.session_key = last.session_key and j.event = 'place_order' and j.outcome = 'saved' and j.created_at >= p_from and j.created_at < p_to
        )
        group by 1, 2 order by 3 desc limit 12
      ) x
    ),
    'coverage', jsonb_build_object(
      'observed_since', (select min(created_at) from private.journey_events_v1),
      'events', (select count(*) from private.journey_events_v1 where created_at >= p_from and created_at < p_to),
      'test_excluded', true
    )
  );
end;
$$;

-- The explorer: redacted rows (hashed session key, page path, codes), newest first.
create or replace function private.admin_journey_explorer(p_from timestamptz, p_to timestamptz, p_event text default null, p_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return (
    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]')
    from (
      select e.created_at, e.session_key, e.event, e.page_type, e.page_path, e.step, e.outcome, e.error_code, e.field_category, e.cta_position, e.option_code, e.scroll_percent, e.device, e.source, p.title as product
      from private.journey_events_v1 e
      left join public.products p on p.id = e.product_id
      where e.created_at >= p_from and e.created_at < p_to and (nullif(p_event, '') is null or e.event = p_event)
      order by e.created_at desc
      limit least(greatest(coalesce(p_limit, 200), 1), 1000)
    ) r
  );
end;
$$;

-- 5. Admin Website ------------------------------------------------------------------------------

create or replace function private.admin_website_summary(p_from timestamptz, p_to timestamptz, p_device text default null, p_source text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_device text := nullif(p_device, '');
  v_source text := nullif(p_source, '');
begin
  perform public.require_admin();
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '400 days' then
    raise exception 'PERIOD' using errcode = 'check_violation';
  end if;
  return (
    with s as (
      select s.*, private.device_class(s.device) dc,
        private.source_class(s.last_touch_source, s.fbclid, s.gclid, s.gbraid, s.wbraid, s.referrer) src,
        private.source_class(s.first_touch_source, s.fbclid, s.gclid, s.gbraid, s.wbraid, s.referrer) first_src
      from public.attribution_sessions s
      where not s.is_test and s.created_at >= p_from and s.created_at < p_to
    ), sf as (
      select * from s where (v_device is null or dc = v_device) and (v_source is null or src = v_source)
    ), a as (
      select a.action_type, a.product_id, a.arrival_id, a.created_at
      from public.attribution_actions a join sf on sf.arrival_id = a.arrival_id
      where not a.is_test and a.action_type in ('page_view','add_to_basket','checkout_start','whatsapp_opened','whatsapp_stuck','phone_click','delivery_check')
    ), o as (
      select o.* from public.orders o
      where not o.is_test and o.created_at >= p_from and o.created_at < p_to
        and (v_source is null or private.source_class(o.utm_source, o.fbclid, o.gclid, o.gbraid, o.wbraid, o.referrer) = v_source)
    ), w as (
      select w.* from public.whatsapp_enquiries w
      where not w.is_test and w.created_at >= p_from and w.created_at < p_to
        and (v_source is null or private.source_class(w.utm_source, w.fbclid, w.gclid, w.gbraid, w.wbraid, null) = v_source)
    )
    select jsonb_build_object(
      'sessions', (select count(*) from sf),
      'visitors', (select count(distinct visitor_id) from sf),
      'sessions_by_source', (select coalesce(jsonb_object_agg(src, n), '{}') from (select src, count(*) n from sf group by 1) x),
      'sessions_by_first_touch', (select coalesce(jsonb_object_agg(first_src, n), '{}') from (select first_src, count(*) n from sf group by 1) x),
      'sessions_by_device', (select coalesce(jsonb_object_agg(dc, n), '{}') from (select dc, count(*) n from sf group by 1) x),
      'sessions_with', jsonb_build_object(
        'basket', (select count(distinct arrival_id) from a where action_type = 'add_to_basket'),
        'checkout', (select count(distinct arrival_id) from a where action_type = 'checkout_start'),
        'whatsapp_opened', (select count(distinct arrival_id) from a where action_type = 'whatsapp_opened'),
        'phone', (select count(distinct arrival_id) from a where action_type = 'phone_click')
      ),
      'whatsapp', jsonb_build_object(
        'taps', (select count(*) from w),
        'opened', (select count(*) from a where action_type = 'whatsapp_opened'),
        'stuck', (select count(*) from a where action_type = 'whatsapp_stuck'),
        'became_orders', (select count(*) from w where converted_order_id is not null)
      ),
      'orders', jsonb_build_object(
        'placed', (select count(*) from o),
        'placed_value', (select coalesce(sum(total_amount), 0) from o),
        'customer_confirmed', (select count(*) from o where confirmed_at is not null),
        'staff_verified', (select count(*) from o where staff_verified_at is not null),
        'verified_value', (select coalesce(sum(total_amount), 0) from o where staff_verified_at is not null and status <> 'cancelled'),
        'held', (select count(*) from o where held_at is not null and status not in ('cancelled','delivered')),
        'delivered', (select count(*) from o where status = 'delivered'),
        'cancelled', (select count(*) from o where status = 'cancelled')
      ),
      'top_landing', (
        select coalesce(jsonb_agg(jsonb_build_object('path', path, 'sessions', n) order by n desc), '[]')
        from (select split_part(split_part(coalesce(landing_page, '/'), '?', 1), '#', 1) path, count(*) n from sf group by 1 order by 2 desc limit 10) x
      ),
      'top_products', (
        select coalesce(jsonb_agg(jsonb_build_object('product', title, 'basket_adds', n) order by n desc), '[]')
        from (select p.title, count(*) n from a join public.products p on p.id = a.product_id where a.action_type = 'add_to_basket' group by 1 order by 2 desc limit 10) x
      ),
      'daily', (
        select coalesce(jsonb_agg(jsonb_build_object('day', day, 'sessions', sessions, 'basket', basket, 'orders', orders) order by day), '[]')
        from (
          select g.dd::date as day,
            (select count(*) from sf where (sf.created_at at time zone 'Europe/London')::date = g.dd::date) sessions,
            (select count(distinct arrival_id) from a where a.action_type = 'add_to_basket' and (a.created_at at time zone 'Europe/London')::date = g.dd::date) basket,
            (select count(*) from o where (o.created_at at time zone 'Europe/London')::date = g.dd::date) orders
          from generate_series((p_from at time zone 'Europe/London')::date, ((p_to - interval '1 second') at time zone 'Europe/London')::date, interval '1 day') g(dd)
        ) x
      ),
      -- Seasonal windows started in the period, and how many of those visitors came back, by days since the start.
      -- Only windows old enough for a bucket count in its denominator (mature cohorts).
      'returning_after_offer', (
        select jsonb_agg(jsonb_build_object('bucket', b.label, 'windows', b.mature, 'returned', b.returned) order by b.ord)
        from (
          select ord, label,
            count(*) filter (where e.started_at + hi <= now()) as mature,
            count(*) filter (where e.started_at + hi <= now() and exists (
              select 1 from public.attribution_sessions r
              where r.visitor_id = e.visitor_id and not r.is_test
                and r.created_at >= case when ord = 4 then e.expires_at else e.started_at + lo end
                and r.created_at < case when ord = 4 then e.started_at + hi else least(e.started_at + hi, e.expires_at) end
            )) as returned
          from public.offer_entitlements e
          cross join (values
            (1, 'Days 1-4', interval '30 minutes', interval '4 days'),
            (2, 'Days 5-7', interval '4 days', interval '7 days'),
            (3, 'Days 8-14', interval '7 days', interval '14 days'),
            (4, 'After it ended (to day 28)', interval '14 days', interval '28 days')
          ) as bk(ord, label, lo, hi)
          where e.source = 'seasonal' and e.started_at >= p_from and e.started_at < p_to
          group by ord, label
        ) b
      ),
      'coverage', jsonb_build_object('visits_since', (select min(created_at) from public.attribution_sessions where not is_test), 'test_excluded', true)
    )
  );
end;
$$;

-- 6. Admin Business -----------------------------------------------------------------------------

create or replace function private.admin_business_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '800 days' then
    raise exception 'PERIOD' using errcode = 'check_violation';
  end if;
  return (
    with o as (select * from public.orders where not is_test and created_at >= p_from and created_at < p_to)
    select jsonb_build_object(
      'by_status', (select coalesce(jsonb_agg(jsonb_build_object('status', status, 'orders', n, 'value', v) order by n desc), '[]') from (select status, count(*) n, sum(total_amount) v from o group by 1) x),
      'placed', (select count(*) from o),
      'placed_value', (select coalesce(sum(total_amount), 0) from o),
      'verified', (select count(*) from o where staff_verified_at is not null and status <> 'cancelled'),
      'verified_value', (select coalesce(sum(total_amount), 0) from o where staff_verified_at is not null and status <> 'cancelled'),
      'delivered', (select count(*) from o where status = 'delivered'),
      'delivered_value', (select coalesce(sum(total_amount), 0) from o where status = 'delivered'),
      'cancelled', (select count(*) from o where status = 'cancelled'),
      'cancelled_value', (select coalesce(sum(total_amount), 0) from o where status = 'cancelled'),
      'discounts_given', (select coalesce(sum(discount_amount), 0) from o where status <> 'cancelled'),
      'by_offer', (select coalesce(jsonb_object_agg(coalesce(offer_source, 'none'), n), '{}') from (select offer_source, count(*) n from o group by 1) x),
      'daily', (
        select coalesce(jsonb_agg(jsonb_build_object('day', day, 'orders', n, 'value', v, 'verified', vn) order by day), '[]')
        from (
          select (created_at at time zone 'Europe/London')::date as day, count(*) n, sum(total_amount) v, count(*) filter (where staff_verified_at is not null and status <> 'cancelled') vn
          from o group by 1
        ) x
      )
    )
  );
end;
$$;

-- 7. Public wrappers (admins only) --------------------------------------------------------------

create or replace function public.admin_journey_daily(p_from timestamptz, p_to timestamptz, p_device text default null, p_source text default null)
returns jsonb language sql set search_path = '' as $$ select private.admin_journey_daily(p_from, p_to, p_device, p_source) $$;
create or replace function public.admin_journey_explorer(p_from timestamptz, p_to timestamptz, p_event text default null, p_limit integer default 200)
returns jsonb language sql set search_path = '' as $$ select private.admin_journey_explorer(p_from, p_to, p_event, p_limit) $$;
create or replace function public.admin_website_summary(p_from timestamptz, p_to timestamptz, p_device text default null, p_source text default null)
returns jsonb language sql set search_path = '' as $$ select private.admin_website_summary(p_from, p_to, p_device, p_source) $$;
create or replace function public.admin_business_summary(p_from timestamptz, p_to timestamptz)
returns jsonb language sql set search_path = '' as $$ select private.admin_business_summary(p_from, p_to) $$;

do $$
declare f text;
begin
  foreach f in array array[
    'private.journey_metadata_ok(jsonb)', 'private.try_int(text)', 'private.source_class(text,text,text,text,text,text)', 'private.device_class(text)',
    'private.journey_funnel(timestamptz,timestamptz,text,text)',
    'private.admin_journey_daily(timestamptz,timestamptz,text,text)', 'public.admin_journey_daily(timestamptz,timestamptz,text,text)',
    'private.admin_journey_explorer(timestamptz,timestamptz,text,integer)', 'public.admin_journey_explorer(timestamptz,timestamptz,text,integer)',
    'private.admin_website_summary(timestamptz,timestamptz,text,text)', 'public.admin_website_summary(timestamptz,timestamptz,text,text)',
    'private.admin_business_summary(timestamptz,timestamptz)', 'public.admin_business_summary(timestamptz,timestamptz)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
  end loop;
  foreach f in array array[
    'private.admin_journey_daily(timestamptz,timestamptz,text,text)', 'public.admin_journey_daily(timestamptz,timestamptz,text,text)',
    'private.admin_journey_explorer(timestamptz,timestamptz,text,integer)', 'public.admin_journey_explorer(timestamptz,timestamptz,text,integer)',
    'private.admin_website_summary(timestamptz,timestamptz,text,text)', 'public.admin_website_summary(timestamptz,timestamptz,text,text)',
    'private.admin_business_summary(timestamptz,timestamptz)', 'public.admin_business_summary(timestamptz,timestamptz)'
  ] loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- 8. Retention: journey events 90 days ---------------------------------------------------------

create or replace function private.journey_cleanup()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (delete from public.attribution_actions where action_type = 'journey_event' and created_at < now() - interval '90 days' returning 1)
  select count(*)::integer from d
$$;
revoke execute on function private.journey_cleanup() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'journey-cleanup') then
    perform cron.unschedule('journey-cleanup');
  end if;
  perform cron.schedule('journey-cleanup', '17 3 * * *', 'select private.journey_cleanup()');
end $$;
