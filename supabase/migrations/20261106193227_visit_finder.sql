-- Finding the website visit behind a WhatsApp or phone order.
--
-- Customers who ring, or WhatsApp without the HW-WA reference (a saved
-- number, a basket reminder, samples), leave no link between their order and
-- the advert that brought them. Staff now find the visit by roughly when it
-- happened (or by the phone or email the customer gave before) and link it.
--
-- 1. Every visit (attribution_sessions row) gets a reference, HW-V-261106-K7P2QX,
--    and a coarse device label ("iPhone, Instagram app"); the full browser
--    string is never stored.
-- 2. The visit's journey: pages viewed, basket adds, checkout starts and call
--    taps (attribution_actions, written by /api/visit only while the visitor
--    leaves our own statistics on), deleted after 90 days.
-- 3. find_visits (staff only): visits around a UK time, or matched by phone or
--    email, each with its journey merged with the WhatsApp taps, basket
--    reminders, samples, contact messages and orders it led to.
-- 4. A manual order takes an HW-V visit reference as well as an HW-WA one, and
--    copies the visit's attribution: the visitor ID, the ad's tags, and Meta's
--    click and browser IDs (only ever saved from a visit that accepted
--    marketing cookies). An HW-WA reference now copies the same from its visit
--    (it carried the visitor ID only). link_order_visit does it for a saved
--    WhatsApp or phone order until its Purchase has gone to Meta.

-- 1. Visit references and device labels -----------------------------------------

alter table public.attribution_sessions
  add column reference text,
  add column device text check (device is null or length(device) <= 60);

update public.attribution_sessions
set reference = 'HW-V-' || to_char(created_at at time zone 'Europe/London', 'YYMMDD') || '-' || public.random_code(6);

alter table public.attribution_sessions
  alter column reference set default ('HW-V-' || to_char(now() at time zone 'Europe/London', 'YYMMDD') || '-' || public.random_code(6)),
  alter column reference set not null,
  add constraint attribution_sessions_reference_check check (reference ~ '^HW-V-[0-9]{6}-[A-Z0-9]{6}$');

create unique index attribution_sessions_reference_key on public.attribution_sessions (reference);
create index attribution_actions_arrival_idx on public.attribution_actions (arrival_id, created_at)
  where arrival_id is not null;

-- 2. The journey is kept 90 days ---------------------------------------------------

select cron.schedule(
  'heartwell-visit-journey-cleanup', '35 3 * * *',
  $$delete from public.attribution_actions where created_at < now() - interval '90 days'$$
);

-- 3. What an order copies from a visit ---------------------------------------------
--
-- The visitor, and the ad that brought them: this visit's tags, or failing
-- that the same visitor's latest tagged visit in the 28 days before it. Meta's
-- IDs come from the visit that has them; fbc is made from the visit's ad click
-- (Meta's documented format) when the Pixel's cookie doesn't hold that click.

create function private.visit_attribution(p_arrival_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.attribution_sessions%rowtype;
  t public.attribution_sessions%rowtype;
begin
  select * into s from public.attribution_sessions where arrival_id = p_arrival_id;
  if not found then
    return null;
  end if;

  if coalesce(s.last_touch_source, s.last_touch_medium, s.last_touch_campaign, s.fbclid, s.gclid) is not null then
    t := s;
  else
    select * into t
    from public.attribution_sessions x
    where x.visitor_id = s.visitor_id
      and x.created_at < s.created_at
      and x.created_at > s.created_at - interval '28 days'
      and coalesce(x.last_touch_source, x.last_touch_medium, x.last_touch_campaign, x.fbclid, x.gclid) is not null
    order by x.created_at desc
    limit 1;
    if not found then
      t := s;
    end if;
  end if;

  return jsonb_build_object(
    'reference', s.reference,
    'visitor_id', s.visitor_id,
    'session_id', s.session_id,
    'arrival_id', s.arrival_id,
    'is_test', s.is_test,
    'from_ad', coalesce(t.last_touch_medium = 'paid_social' or t.first_touch_medium = 'paid_social' or t.fbclid is not null, false),
    'utm_source', t.last_touch_source,
    'utm_medium', t.last_touch_medium,
    'utm_campaign', t.last_touch_campaign,
    'utm_content', t.last_touch_content,
    'utm_term', t.last_touch_term,
    'gclid', t.gclid,
    'gbraid', t.gbraid,
    'wbraid', t.wbraid,
    'fbclid', t.fbclid,
    'ga_client_id', coalesce(s.ga_client_id, t.ga_client_id),
    'meta_fbp', coalesce(s.meta_fbp, t.meta_fbp),
    -- The cookie is read as the visit lands, before the Pixel has seen this
    -- click, so it can hold an older one: the visit's own click wins.
    'meta_fbc', case
      when t.fbclid is not null and position(t.fbclid in coalesce(t.meta_fbc, '')) = 0
        then 'fb.1.' || floor(extract(epoch from t.created_at) * 1000)::bigint || '.' || t.fbclid
      else coalesce(t.meta_fbc, s.meta_fbc)
    end
  );
end;
$$;

-- 4. Manual orders take a visit reference --------------------------------------------
--
-- As before, plus: visit_reference (HW-V-…) links the order to that visit (an
-- unknown one is refused, so a typo is caught); an HW-WA reference copies its
-- visit's attribution too. The enquiry's own values win where it has them.

create or replace function private.place_manual_order(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_source text := coalesce(p_input->>'source', 'whatsapp');
  v_name text := public.clean_text(p_input->>'customer_name', 120);
  v_phone text := public.clean_text(p_input->>'customer_phone', 30);
  v_email text := lower(public.clean_text(p_input->>'customer_email', 254));
  v_address text := public.clean_text(p_input->>'shipping_address', 400);
  v_postcode text;
  v_class jsonb;
  v_date date;
  v_delivery numeric(10,2);
  v_subtotal numeric(10,2);
  v_has_mto boolean;
  v_wa_ref text := nullif(upper(btrim(coalesce(p_input->>'whatsapp_reference', ''))), '');
  v_visit_ref text := nullif(upper(btrim(coalesce(p_input->>'visit_reference', ''))), '');
  v_enquiry public.whatsapp_enquiries%rowtype;
  v_has_enquiry boolean := false;
  v_arrival uuid;
  v_attr jsonb := '{}'::jsonb;
  v_id uuid;
  v_ref text;
begin
  perform public.require_admin();

  if v_source not in ('whatsapp', 'phone') then
    raise exception 'BAD_SOURCE: %', v_source using errcode = 'check_violation';
  end if;
  if v_name is null or length(v_name) < 2 then
    raise exception 'MISSING_NAME' using errcode = 'check_violation';
  end if;
  if v_phone is null then
    raise exception 'BAD_PHONE' using errcode = 'check_violation';
  end if;
  if v_address is null then
    raise exception 'MISSING_ADDRESS' using errcode = 'check_violation';
  end if;

  v_postcode := coalesce(nullif(public.normalise_postcode(p_input->>'postcode'), ''), public.postcode_from_text(v_address));
  v_class := public.classify_postcode(v_postcode, p_input->>'mixed_area_evidence');
  if v_class->>'kind' = 'invalid' then
    raise exception 'INVALID_POSTCODE' using errcode = 'check_violation';
  end if;

  if nullif(p_input->>'preferred_delivery_date', '') is not null then
    begin
      v_date := (p_input->>'preferred_delivery_date')::date;
    exception when others then
      raise exception 'BAD_DELIVERY_DATE' using errcode = 'check_violation';
    end;
    if v_date < v_today or v_date > v_today + 365 then
      raise exception 'DELIVERY_DATE_OUT_OF_RANGE: % to %', v_today, v_today + 365
        using errcode = 'check_violation';
    end if;
  end if;

  select coalesce(sum(l.unit_price * l.quantity), 0), coalesce(bool_or(l.made_to_order), false)
  into v_subtotal, v_has_mto
  from public.order_lines(p_input->'items', true) l;

  begin
    v_delivery := round(least(greatest(coalesce((p_input->>'delivery_charge')::numeric, 0), 0), 10000), 2);
  exception when others then
    raise exception 'BAD_DELIVERY_CHARGE' using errcode = 'check_violation';
  end;

  if v_visit_ref is not null then
    if v_visit_ref !~ '^HW-V-[0-9]{6}-[A-Z0-9]{6}$' then
      raise exception 'BAD_VISIT_REFERENCE' using errcode = 'check_violation';
    end if;
    select arrival_id into v_arrival from public.attribution_sessions where reference = v_visit_ref;
    if not found then
      raise exception 'UNKNOWN_VISIT' using errcode = 'no_data_found';
    end if;
    v_attr := coalesce(private.visit_attribution(v_arrival), '{}'::jsonb);
  elsif v_wa_ref is not null then
    select * into v_enquiry from public.whatsapp_enquiries where reference = v_wa_ref;
    v_has_enquiry := found;
    if v_has_enquiry and v_enquiry.arrival_id is not null then
      v_attr := coalesce(private.visit_attribution(v_enquiry.arrival_id), '{}'::jsonb);
    end if;
  end if;

  insert into public.orders (
    source, is_test, test_reason,
    customer_name, customer_email, customer_phone, shipping_address, postcode, delivery_zone,
    special_instructions, preferred_delivery_date,
    items_subtotal, delivery_total, total_amount, has_made_to_order,
    visitor_id, session_id, arrival_id, gclid, gbraid, wbraid, fbclid,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    ga_client_id, meta_fbp, meta_fbc, whatsapp_reference
  )
  values (
    v_source,
    coalesce((p_input->>'is_test') = 'true', false) or coalesce(v_enquiry.is_test, false)
      or coalesce((v_attr->>'is_test')::boolean, false),
    public.clean_text(p_input->>'test_reason', 200),
    v_name, v_email, v_phone, v_address, v_class->>'postcode',
    case when v_class->>'zone' = 'MAINLAND_STANDARD' then 'MAINLAND_STANDARD' else 'CUSTOM_QUOTE' end,
    public.clean_text(p_input->>'special_instructions', 1000), v_date,
    v_subtotal, v_delivery, v_subtotal + v_delivery, v_has_mto,
    coalesce(v_enquiry.visitor_id, public.try_uuid(v_attr->>'visitor_id')),
    coalesce(v_enquiry.session_id, public.try_uuid(v_attr->>'session_id')),
    coalesce(v_enquiry.arrival_id, public.try_uuid(v_attr->>'arrival_id')),
    coalesce(v_enquiry.gclid, v_attr->>'gclid'), coalesce(v_enquiry.gbraid, v_attr->>'gbraid'),
    coalesce(v_enquiry.wbraid, v_attr->>'wbraid'), coalesce(v_enquiry.fbclid, v_attr->>'fbclid'),
    coalesce(v_enquiry.utm_source, v_attr->>'utm_source'), coalesce(v_enquiry.utm_medium, v_attr->>'utm_medium'),
    coalesce(v_enquiry.utm_campaign, v_attr->>'utm_campaign'), coalesce(v_enquiry.utm_content, v_attr->>'utm_content'),
    coalesce(v_enquiry.utm_term, v_attr->>'utm_term'),
    coalesce(v_enquiry.ga_client_id, v_attr->>'ga_client_id'), coalesce(v_enquiry.meta_fbp, v_attr->>'meta_fbp'),
    coalesce(v_enquiry.meta_fbc, v_attr->>'meta_fbc'),
    coalesce(v_enquiry.reference, v_wa_ref)
  )
  returning id, reference into v_id, v_ref;

  insert into public.order_items (
    order_id, position, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
    material_id, material_code, material_name, material_collection, customisation, custom_title
  )
  select v_id, l.line_no, l.variant_id, l.product_id, l.quantity, l.unit_price, l.title, l.trade_title, l.sku,
         l.colour_name, l.material_id, l.material_code, l.material_name, l.material_collection, l.customisation,
         l.custom_title
  from public.order_lines(p_input->'items', true) l;

  if v_has_enquiry then
    update public.whatsapp_enquiries
    set converted_order_id = v_id, converted_at = now()
    where id = v_enquiry.id;
  end if;

  if v_attr ? 'reference' then
    insert into public.order_events (order_id, kind, actor, note)
    values (v_id, 'note', auth.uid(),
            'Website visit ' || (v_attr->>'reference')
              || case when (v_attr->>'from_ad')::boolean then ' (from an ad)' else '' end);
  end if;

  return jsonb_build_object(
    'id', v_id,
    'reference', v_ref,
    'items_subtotal', v_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_subtotal + v_delivery,
    'delivery_zone', case when v_class->>'zone' = 'MAINLAND_STANDARD' then 'MAINLAND_STANDARD' else 'CUSTOM_QUOTE' end
  );
end;
$$;

-- 5. Linking a saved WhatsApp or phone order ------------------------------------------
--
-- HW-V or HW-WA reference; blank unlinks. Refused once the order's Purchase is
-- being sent or has gone to Meta (what Meta has can't be changed).

create function private.link_order_visit(p_order_id uuid, p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref text := nullif(upper(btrim(coalesce(p_reference, ''))), '');
  v_order public.orders%rowtype;
  v_enquiry public.whatsapp_enquiries%rowtype;
  v_arrival uuid;
  v_attr jsonb := '{}'::jsonb;
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.source not in ('whatsapp', 'phone') then
    raise exception 'NOT_MANUAL' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.conversion_outbox
    where order_id = p_order_id and platform = 'meta' and event_name = 'Purchase' and status in ('sending', 'sent')
  ) then
    raise exception 'PURCHASE_SENT' using errcode = 'check_violation';
  end if;

  if v_ref is null then
    null;
  elsif v_ref ~ '^HW-V-[0-9]{6}-[A-Z0-9]{6}$' then
    select arrival_id into v_arrival from public.attribution_sessions where reference = v_ref;
    if not found then
      raise exception 'UNKNOWN_VISIT' using errcode = 'no_data_found';
    end if;
    v_attr := coalesce(private.visit_attribution(v_arrival), '{}'::jsonb);
  elsif v_ref ~ '^HW-WA-[0-9]{6}-[A-Z0-9]{6}$' then
    select * into v_enquiry from public.whatsapp_enquiries where reference = v_ref;
    if not found then
      raise exception 'UNKNOWN_VISIT' using errcode = 'no_data_found';
    end if;
    if v_enquiry.arrival_id is not null then
      v_attr := coalesce(private.visit_attribution(v_enquiry.arrival_id), '{}'::jsonb);
    end if;
  else
    raise exception 'BAD_VISIT_REFERENCE' using errcode = 'check_violation';
  end if;

  update public.orders
  set visitor_id = coalesce(v_enquiry.visitor_id, public.try_uuid(v_attr->>'visitor_id')),
      session_id = coalesce(v_enquiry.session_id, public.try_uuid(v_attr->>'session_id')),
      arrival_id = coalesce(v_enquiry.arrival_id, public.try_uuid(v_attr->>'arrival_id')),
      gclid = coalesce(v_enquiry.gclid, v_attr->>'gclid'),
      gbraid = coalesce(v_enquiry.gbraid, v_attr->>'gbraid'),
      wbraid = coalesce(v_enquiry.wbraid, v_attr->>'wbraid'),
      fbclid = coalesce(v_enquiry.fbclid, v_attr->>'fbclid'),
      utm_source = coalesce(v_enquiry.utm_source, v_attr->>'utm_source'),
      utm_medium = coalesce(v_enquiry.utm_medium, v_attr->>'utm_medium'),
      utm_campaign = coalesce(v_enquiry.utm_campaign, v_attr->>'utm_campaign'),
      utm_content = coalesce(v_enquiry.utm_content, v_attr->>'utm_content'),
      utm_term = coalesce(v_enquiry.utm_term, v_attr->>'utm_term'),
      ga_client_id = coalesce(v_enquiry.ga_client_id, v_attr->>'ga_client_id'),
      meta_fbp = coalesce(v_enquiry.meta_fbp, v_attr->>'meta_fbp'),
      meta_fbc = coalesce(v_enquiry.meta_fbc, v_attr->>'meta_fbc'),
      whatsapp_reference = case when v_enquiry.id is not null then v_enquiry.reference else whatsapp_reference end
  where id = p_order_id;

  if v_enquiry.id is not null and v_enquiry.converted_order_id is null then
    update public.whatsapp_enquiries
    set converted_order_id = p_order_id, converted_at = now()
    where id = v_enquiry.id;
  end if;

  insert into public.order_events (order_id, kind, actor, note)
  values (p_order_id, 'note', auth.uid(),
          case when v_ref is null then 'Website visit unlinked'
               else 'Website visit linked: ' || coalesce(v_attr->>'reference', v_ref)
                    || case when coalesce((v_attr->>'from_ad')::boolean, false) then ' (from an ad)' else '' end
          end);

  return jsonb_build_object('reference', v_attr->>'reference', 'from_ad', coalesce((v_attr->>'from_ad')::boolean, false));
end;
$$;

-- 6. Finding visits ---------------------------------------------------------------------
--
-- p_input: { date: 'YYYY-MM-DD', time: 'HH:MM', zone: 'uk' or 'pk' (the time
-- as the UK or Pakistan team sees it), minutes: either side (5 to 720),
-- ads_only, include_tests, contact: a phone number or email; or arrival_id
-- for one visit }.
-- Visits matched by the contact details come first, then the rest by how close
-- they were to the time. Up to 30, each with up to 80 steps. No contact details
-- are returned, only what matched.

create function private.find_visits(p_input jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_at timestamptz;
  v_minutes integer;
  v_from timestamptz;
  v_to timestamptz;
  v_ads_only boolean := coalesce((p_input->>'ads_only') = 'true', false);
  v_tests boolean := coalesce((p_input->>'include_tests') = 'true', false);
  -- The UK team and the Pakistan team each give the time as they see it.
  v_zone text := case when p_input->>'zone' = 'pk' then 'Asia/Karachi' else 'Europe/London' end;
  v_contact text := public.clean_text(p_input->>'contact', 254);
  -- One visit by its arrival ID: the order page shows the visit an order is linked to.
  v_arrival uuid := public.try_uuid(p_input->>'arrival_id');
  v_email text;
  v_phone text;
  v_visits jsonb;
begin
  perform public.require_admin();

  begin
    v_minutes := least(greatest(coalesce((p_input->>'minutes')::integer, 30), 5), 720);
  exception when others then
    raise exception 'BAD_WINDOW' using errcode = 'check_violation';
  end;

  if nullif(p_input->>'date', '') is not null then
    begin
      v_at := ((p_input->>'date') || ' ' || coalesce(nullif(p_input->>'time', ''), '12:00'))::timestamp
              at time zone v_zone;
    exception when others then
      raise exception 'BAD_TIME' using errcode = 'check_violation';
    end;
    v_from := v_at - make_interval(mins => v_minutes);
    v_to := v_at + make_interval(mins => v_minutes);
  end if;

  if v_contact is not null then
    if position('@' in v_contact) > 0 then
      v_email := lower(v_contact);
    else
      v_phone := right(regexp_replace(v_contact, '[^0-9]', '', 'g'), 10);
      if length(v_phone) < 10 then
        v_phone := null;
      end if;
    end if;
  end if;

  if v_at is null and v_email is null and v_phone is null and v_arrival is null then
    raise exception 'NOTHING_TO_FIND' using errcode = 'check_violation';
  end if;

  with by_time as (
    select s.arrival_id from public.attribution_sessions s
    where v_arrival is not null and s.arrival_id = v_arrival
    union
    select s.arrival_id from public.attribution_sessions s
    where v_at is not null and s.created_at between v_from and v_to
    union
    select a.arrival_id from public.attribution_actions a
    where v_at is not null and a.arrival_id is not null and a.created_at between v_from and v_to
    union
    select s.arrival_id
    from public.whatsapp_enquiries e
    join public.attribution_sessions s on s.session_id = e.session_id
    where v_at is not null and e.created_at between v_from and v_to
  ),
  by_contact as (
    select b.arrival_id, 'basket_reminder'::text as how
    from public.basket_reminder_leads b
    where (v_email is not null and lower(b.email) = v_email)
       or (v_phone is not null and right(regexp_replace(coalesce(b.phone, ''), '[^0-9]', '', 'g'), 10) = v_phone)
    union all
    select s.arrival_id, 'samples'
    from public.sample_requests r
    join public.attribution_sessions s on s.session_id = r.session_id
    where (v_email is not null and lower(r.customer_email) = v_email)
       or (v_phone is not null and right(regexp_replace(coalesce(r.customer_phone, ''), '[^0-9]', '', 'g'), 10) = v_phone)
    union all
    select o.arrival_id, 'order'
    from public.orders o
    where o.source = 'website' and o.arrival_id is not null
      and ((v_email is not null and lower(o.customer_email) = v_email)
        or (v_phone is not null and right(regexp_replace(o.customer_phone, '[^0-9]', '', 'g'), 10) = v_phone))
    union all
    select (
      select s.arrival_id from public.attribution_sessions s
      where s.visitor_id = m.visitor_id and s.created_at <= m.created_at
      order by s.created_at desc limit 1
    ), 'contact_message'
    from public.contact_messages m
    where m.visitor_id is not null
      and ((v_email is not null and lower(m.email) = v_email)
        or (v_phone is not null and right(regexp_replace(coalesce(m.phone, ''), '[^0-9]', '', 'g'), 10) = v_phone))
  ),
  hits as (
    select arrival_id, null::text as how from by_time
    union all
    select arrival_id, how from by_contact where arrival_id is not null
  ),
  picked as (
    select f.arrival_id, coalesce(array_agg(distinct f.how) filter (where f.how is not null), '{}') as matched
    from hits f
    group by f.arrival_id
  ),
  visits as (
    select s.*, p.matched,
      greatest(
        s.last_seen_at,
        coalesce((select max(a.created_at) from public.attribution_actions a where a.arrival_id = s.arrival_id), s.created_at)
      ) as last_at,
      coalesce(s.last_touch_medium = 'paid_social' or s.first_touch_medium = 'paid_social' or s.fbclid is not null, false) as from_ad
    from picked p
    join public.attribution_sessions s on s.arrival_id = p.arrival_id
    where v_tests or not s.is_test
  ),
  ranked as (
    select v.*,
      case when cardinality(v.matched) > 0 then 0 else 1 end as tier,
      case
        when v_at is null or v_at between v.created_at and v.last_at then 0
        else least(abs(extract(epoch from v.created_at - v_at)), abs(extract(epoch from v.last_at - v_at)))
      end as distance
    from visits v
    where not v_ads_only or v.from_ad or cardinality(v.matched) > 0
    order by tier, distance, v.created_at desc
    limit 30
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'reference', r.reference,
    'started_at', r.created_at,
    'last_at', r.last_at,
    'device', r.device,
    'landing_page', r.landing_page,
    'referrer', r.referrer,
    'source', r.last_touch_source,
    'medium', r.last_touch_medium,
    'campaign', r.last_touch_campaign,
    'content', r.last_touch_content,
    'from_ad', r.from_ad,
    'meta_ids', r.fbclid is not null or r.meta_fbc is not null or r.meta_fbp is not null,
    'is_test', r.is_test,
    'matched', to_jsonb(r.matched),
    'other_visits', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'reference', x.reference, 'started_at', x.created_at, 'source', x.last_touch_source,
        'medium', x.last_touch_medium, 'content', x.last_touch_content
      ) order by x.created_at desc), '[]'::jsonb)
      from (
        select * from public.attribution_sessions x
        where x.visitor_id = r.visitor_id and x.arrival_id <> r.arrival_id
        order by x.created_at desc
        limit 5
      ) x
    ),
    'steps', (
      select coalesce(jsonb_agg(z.j order by z.at), '[]'::jsonb)
      from (
        select u.at, u.j from (
          select a.created_at as at, jsonb_build_object(
            'at', a.created_at, 'kind', a.action_type, 'path', a.page_url,
            'title', coalesce(p.title, rg.name, c.name, a.metadata->>'name'),
            'value', a.metadata->'value'
          ) as j
          from public.attribution_actions a
          left join public.products p on a.page_url like '/products/%' and p.slug = split_part(a.page_url, '/', 3)
          left join public.ranges rg on a.page_url like '/ranges/%' and rg.slug = split_part(a.page_url, '/', 3)
          left join public.categories c on a.page_url like '/sofas/%' and c.slug = split_part(a.page_url, '/', 3)
          where a.arrival_id = r.arrival_id
          union all
          select e.created_at, jsonb_build_object('at', e.created_at, 'kind', 'whatsapp', 'title', e.product_name, 'ref', e.reference)
          from public.whatsapp_enquiries e where e.session_id = r.session_id
          union all
          select b.created_at, jsonb_build_object(
            'at', b.created_at, 'kind', 'basket_reminder',
            'title', case when b.email_opt_in and b.whatsapp_opt_in then 'email and WhatsApp'
                          when b.whatsapp_opt_in then 'WhatsApp' else 'email' end
          )
          from public.basket_reminder_leads b where b.session_id = r.session_id
          union all
          select q.created_at, jsonb_build_object(
            'at', q.created_at, 'kind', 'samples',
            'value', (select count(*) from public.sample_request_items i where i.request_id = q.id)
          )
          from public.sample_requests q where q.session_id = r.session_id
          union all
          select m.created_at, jsonb_build_object('at', m.created_at, 'kind', 'contact_message', 'title', m.topic)
          from public.contact_messages m
          where m.visitor_id = r.visitor_id and m.created_at between r.created_at and r.last_at + interval '1 hour'
          union all
          select o.created_at, jsonb_build_object('at', o.created_at, 'kind', 'order', 'ref', o.reference, 'title', o.status, 'source', o.source)
          from public.orders o where o.arrival_id = r.arrival_id
        ) u
        order by u.at
        limit 80
      ) z
    )
  ) order by r.tier, r.distance, r.created_at desc), '[]'::jsonb)
  into v_visits
  from ranked r;

  return jsonb_build_object('visits', v_visits, 'at', v_at, 'minutes', v_minutes);
end;
$$;

-- Wrappers and grants -------------------------------------------------------------------

create function public.find_visits(p_input jsonb)
returns jsonb language sql stable set search_path = ''
as $$ select private.find_visits(p_input) $$;

create function public.link_order_visit(p_order_id uuid, p_reference text)
returns jsonb language sql set search_path = ''
as $$ select private.link_order_visit(p_order_id, p_reference) $$;

revoke all on function
  private.visit_attribution(uuid), private.find_visits(jsonb), private.link_order_visit(uuid, text),
  public.find_visits(jsonb), public.link_order_visit(uuid, text)
from public, anon, authenticated;

-- Staff only (checked inside with require_admin()).
grant execute on function
  private.find_visits(jsonb), private.link_order_visit(uuid, text),
  public.find_visits(jsonb), public.link_order_visit(uuid, text)
to authenticated, service_role;
