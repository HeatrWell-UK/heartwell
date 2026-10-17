-- Delivery areas and charges (owner, 17 October 2026).
--
-- Delivery stays free to most of mainland Britain. Six areas pay a delivery
-- charge and take 5 to 7 working days instead of 2 to 4: Devon and the
-- Aberdeen area £40; Cornwall, the Scottish Highlands and Moray, and North East
-- Scotland £80; the far north of Scotland (Caithness, Sutherland, Ullapool and
-- Gairloch) £100. Each area is a list of postcode districts (outward codes),
-- which admins can change. The islands, Northern Ireland and the other
-- quote-only places are untouched: classify_postcode still sends them to a
-- quote, never the online checkout.
--
-- No deliveries on Mondays: a customer's preferred day can't be one of
-- shop_settings.no_delivery_days (ISO days, 1 = Monday).
--
-- price_order adds the area's charge when its input has a postcode, and
-- place_order stores it (orders.delivery_area and orders.fee_area, inside
-- delivery_total), so the total, the emails, OrderFlow's total and the
-- Purchase value all include it.

-- The areas ---------------------------------------------------------------

create table public.delivery_areas (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 60),
  places text not null default '' check (length(places) <= 200),
  charge numeric(10,2) not null check (charge between 0 and 1000),
  min_working_days smallint not null check (min_working_days between 0 and 60),
  max_working_days smallint not null check (max_working_days between 0 and 90),
  districts text[] not null default '{}'
    check (array_to_string(districts, ',') ~ '^([A-Z]{1,2}[0-9][0-9A-Z]?(,|$))*$'),
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_working_days >= min_working_days)
);

comment on table public.delivery_areas is
  'Mainland postcode districts that pay a delivery charge and take longer. Everywhere else on the mainland is free.';

-- A district belongs to one area at most.
create function private.check_delivery_area_districts()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_clash text;
begin
  select d into v_clash
  from public.delivery_areas a, unnest(a.districts) d
  where a.slug <> new.slug and d = any (new.districts)
  limit 1;
  if v_clash is not null then
    raise exception 'DISTRICT_IN_TWO_AREAS: %', v_clash using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger delivery_areas_districts
  before insert or update on public.delivery_areas
  for each row execute function private.check_delivery_area_districts();

create trigger delivery_areas_updated_at
  before update on public.delivery_areas
  for each row execute function public.set_updated_at();

alter table public.delivery_areas enable row level security;

create policy "anyone can read the delivery areas" on public.delivery_areas
  for select to anon, authenticated using (true);
create policy "admins insert delivery areas" on public.delivery_areas
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins update delivery areas" on public.delivery_areas
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete delivery areas" on public.delivery_areas
  for delete to authenticated using ((select private.is_admin()));

revoke all on public.delivery_areas from anon, authenticated;
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;

insert into public.delivery_areas (slug, name, places, charge, min_working_days, max_working_days, sort, districts) values
  ('devon', 'Devon', 'Exeter, Plymouth, Torquay, Paignton, Newton Abbot, Tavistock, Ivybridge', 40, 5, 7, 1,
   array['EX1','EX2','EX3','EX4','EX5','EX6','EX7','EX8','EX9','EX10','EX11','EX12','EX13','EX14','EX15','EX16','EX17','EX18','EX19','EX20','EX21','EX22',
         'EX24','EX25','EX26','EX27','EX28','EX29','EX30','EX31','EX32','EX33','EX34','EX35','EX36','EX37','EX38','EX39',
         'PL1','PL2','PL3','PL4','PL5','PL6','PL7','PL8','PL9','PL16','PL19','PL20','PL21',
         'TQ1','TQ2','TQ3','TQ4','TQ5','TQ6','TQ7','TQ8','TQ9','TQ10','TQ11','TQ12','TQ13','TQ14']),
  ('aberdeen-area', 'Aberdeen area', 'Aberdeen, Stonehaven, Inverurie, Banchory, Ellon', 40, 5, 7, 2,
   array['AB10','AB11','AB12','AB13','AB14','AB15','AB16','AB21','AB22','AB23','AB24','AB25',
         'AB30','AB31','AB32','AB33','AB34','AB35','AB36','AB39','AB41','AB51','AB52']),
  ('cornwall', 'Cornwall', 'Truro, Penzance, St Ives, Newquay, Bodmin, Liskeard, Bude', 80, 5, 7, 3,
   array['TR1','TR2','TR3','TR4','TR5','TR6','TR7','TR8','TR9','TR10','TR11','TR12','TR13','TR14','TR15','TR16','TR17','TR18','TR19','TR20','TR26','TR27',
         'PL10','PL11','PL12','PL13','PL14','PL15','PL17','PL18','PL22','PL23','PL24','PL25','PL26','PL27','PL28','PL29','PL30','PL31','PL32','PL33','PL34','PL35',
         'EX23']),
  ('highlands-moray', 'Scottish Highlands and Moray', 'Inverness, Nairn, Elgin, Aviemore, Fort William, Mallaig', 80, 5, 7, 4,
   array['IV1','IV2','IV3','IV4','IV5','IV6','IV7','IV8','IV9','IV10','IV11','IV12','IV13','IV14','IV15','IV16','IV17','IV18','IV19','IV20',
         'IV30','IV31','IV32','IV36','IV40','IV52','IV53','IV54','IV63',
         'PH19','PH20','PH21','PH22','PH23','PH24','PH25','PH26','PH30','PH31','PH32','PH33','PH34','PH35','PH36','PH37','PH38','PH39','PH40','PH41','PH49','PH50',
         'AB37','AB38','AB56']),
  ('north-east-scotland', 'North East Scotland', 'Peterhead, Fraserburgh, Banff, Turriff, Keith', 80, 5, 7, 5,
   array['AB42','AB43','AB44','AB45','AB53','AB54','AB55']),
  ('far-north-scotland', 'Far north of Scotland', 'Thurso, Wick, Ullapool, Lairg, Gairloch (Caithness and Sutherland)', 100, 5, 7, 6,
   array['KW1','KW2','KW3','KW5','KW6','KW7','KW8','KW9','KW10','KW11','KW12','KW13','KW14',
         'IV21','IV22','IV23','IV24','IV25','IV26','IV27','IV28']);

-- The area a postcode is in, or null for the free rest of the mainland.
create function public.delivery_area(p_postcode text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', a.slug,
    'name', a.name,
    'charge', a.charge,
    'min_working_days', a.min_working_days,
    'max_working_days', a.max_working_days
  )
  from public.delivery_areas a
  where split_part(public.normalise_postcode(p_postcode), ' ', 1) = any (a.districts)
  order by a.sort, a.slug
  limit 1;
$$;

revoke execute on function public.delivery_area(text) from public, anon, authenticated;

-- No deliveries on Mondays -------------------------------------------------

alter table public.shop_settings
  add column no_delivery_days smallint[] not null default '{1}'
    check (no_delivery_days <@ '{1,2,3,4,5,6,7}'::smallint[] and cardinality(no_delivery_days) < 7);

comment on column public.shop_settings.no_delivery_days is
  'ISO days with no deliveries (1 = Monday). Customers can''t pick them as their preferred day.';

-- Orders keep the area and its charge --------------------------------------

alter table public.orders
  add column delivery_area text,
  add column fee_area numeric(10,2) not null default 0 check (fee_area >= 0);

comment on column public.orders.delivery_area is 'The charged delivery area at the time of ordering (delivery_areas.name), or null.';
comment on column public.orders.fee_area is 'The area''s delivery charge, included in delivery_total.';

-- Pricing -------------------------------------------------------------------

create or replace function public.price_order(p_input jsonb)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  v_offer jsonb;
  v_delivery jsonb;
  v_extras jsonb := coalesce(p_input->'extras', '{}'::jsonb);
  v_area jsonb;
  v_area_fee numeric(10,2);
  v_subtotal numeric(10,2);
  v_discount numeric(10,2);
  v_has_mto boolean;
begin
  v_offer := public.calculate_order_offer(
    p_input->'items',
    p_input->>'promotion_code',
    public.try_uuid(p_input->>'offer_entitlement_token')
  );

  v_delivery := public.quote_delivery(
    case when v_extras->>'floor' ~ '^[0-9]{1,2}$' then (v_extras->>'floor')::integer else 0 end,
    coalesce((v_extras->>'has_lift') = 'true', false),
    coalesce((v_extras->>'assembly') = 'true', false),
    coalesce((v_extras->>'removal') = 'true', false),
    case when v_extras->>'removal_seats' ~ '^[0-9]{1,2}$' then (v_extras->>'removal_seats')::integer end
  );

  -- The area's charge, once the postcode is known.
  v_area := case when nullif(btrim(coalesce(p_input->>'postcode', '')), '') is not null
                 then public.delivery_area(p_input->>'postcode') end;
  v_area_fee := coalesce((v_area->>'charge')::numeric, 0);
  v_delivery := v_delivery || jsonb_build_object(
    'area', v_area,
    'area_fee', v_area_fee,
    'total', (v_delivery->>'total')::numeric + v_area_fee
  );

  select coalesce(bool_or(l.made_to_order), false) into v_has_mto
  from public.order_lines(p_input->'items') l;

  v_subtotal := (v_offer->>'items_subtotal')::numeric;
  v_discount := (v_offer->>'discount_amount')::numeric;

  return v_offer || jsonb_build_object(
    'delivery', v_delivery,
    'delivery_total', (v_delivery->>'total')::numeric,
    'has_made_to_order', v_has_mto,
    'total_amount', greatest(0, v_subtotal - v_discount) + (v_delivery->>'total')::numeric
  );
end;
$function$;

create or replace function public.place_order(p_input jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.shop_settings%rowtype;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_name text := public.clean_text(p_input->>'customer_name', 120);
  v_phone text := public.clean_text(p_input->>'customer_phone', 30);
  v_email text := lower(public.clean_text(p_input->>'customer_email', 254));
  v_address text := public.clean_text(p_input->>'shipping_address', 400);
  v_class jsonb := public.classify_postcode(p_input->>'postcode', p_input->>'mixed_area_evidence');
  v_attr jsonb := coalesce(p_input->'attribution', '{}'::jsonb);
  v_area jsonb;
  v_earliest integer;
  v_date date;
  v_price jsonb;
  v_expected numeric;
  v_delivery jsonb;
  v_id uuid;
  v_ref text;
  v_number bigint;
begin
  if v_name is null or length(v_name) < 2 then
    raise exception 'MISSING_NAME' using errcode = 'check_violation';
  end if;
  if v_phone is null or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 10 then
    raise exception 'BAD_PHONE' using errcode = 'check_violation';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'BAD_EMAIL' using errcode = 'check_violation';
  end if;
  if v_address is null or length(v_address) < 5 then
    raise exception 'MISSING_ADDRESS' using errcode = 'check_violation';
  end if;
  if v_class->>'kind' = 'invalid' then
    raise exception 'INVALID_POSTCODE' using errcode = 'check_violation';
  end if;
  if v_class->>'kind' <> 'classified' or v_class->>'zone' <> 'MAINLAND_STANDARD' then
    raise exception 'NOT_MAINLAND: %', v_class->>'reason' using errcode = 'check_violation';
  end if;

  select * into s from public.shop_settings where id;
  v_area := public.delivery_area(v_class->>'postcode');

  if nullif(p_input->>'preferred_delivery_date', '') is not null then
    begin
      v_date := (p_input->>'preferred_delivery_date')::date;
    exception when others then
      raise exception 'BAD_DELIVERY_DATE' using errcode = 'check_violation';
    end;
    -- A slower area's earliest day moves back by the extra working days it takes.
    v_earliest := s.preferred_date_min_days
      + greatest(0, coalesce((v_area->>'min_working_days')::integer, s.delivery_min_working_days) - s.delivery_min_working_days);
    if v_date < v_today + v_earliest then
      raise exception 'DELIVERY_DATE_TOO_SOON: earliest is %', v_today + v_earliest
        using errcode = 'check_violation';
    end if;
    if v_date > v_today + s.preferred_date_max_days then
      raise exception 'DELIVERY_DATE_TOO_FAR: latest is %', v_today + s.preferred_date_max_days
        using errcode = 'check_violation';
    end if;
    if extract(isodow from v_date)::smallint = any (s.no_delivery_days) then
      raise exception 'DELIVERY_DATE_CLOSED: %', to_char(v_date, 'FMDay')
        using errcode = 'check_violation';
    end if;
  end if;

  -- Priced with the postcode as the database reads it, so the area charge is the area's.
  v_price := public.price_order(p_input || jsonb_build_object('postcode', v_class->>'postcode'));
  v_delivery := v_price->'delivery';

  begin
    v_expected := (p_input->>'expected_total')::numeric;
  exception when others then
    v_expected := null;
  end;
  if round((v_price->>'total_amount')::numeric, 2) is distinct from round(coalesce(v_expected, -1), 2) then
    raise exception 'PRICE_MISMATCH: quoted % but current prices give %',
      coalesce(v_expected, -1), v_price->>'total_amount'
      using errcode = 'check_violation';
  end if;

  insert into public.orders (
    source, is_test, test_reason,
    customer_name, customer_email, customer_phone, shipping_address, postcode, delivery_zone,
    special_instructions, preferred_delivery_date,
    items_subtotal, discount_amount, discount_tier, promotion_code, offer_source,
    delivery_floor, delivery_has_lift, fee_upstairs, wants_assembly, fee_assembly,
    wants_removal, removal_seats, fee_removal, delivery_area, fee_area, delivery_total, total_amount, has_made_to_order,
    tracking_consent,
    visitor_id, session_id, arrival_id, gclid, gbraid, wbraid, fbclid,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    landing_page, referrer, ga_client_id, meta_fbp, meta_fbc,
    customer_ip, customer_user_agent
  )
  values (
    'website',
    coalesce((p_input->>'is_test') = 'true', false),
    public.clean_text(p_input->>'test_reason', 200),
    v_name, v_email, v_phone, v_address, v_class->>'postcode', 'MAINLAND_STANDARD',
    public.clean_text(p_input->>'special_instructions', 1000), v_date,
    (v_price->>'items_subtotal')::numeric, (v_price->>'discount_amount')::numeric,
    v_price->>'discount_tier', v_price->>'promotion_code', v_price->>'offer_source',
    (v_delivery->>'floor')::smallint, (v_delivery->>'has_lift')::boolean, (v_delivery->>'upstairs')::numeric,
    (v_delivery->>'assembly')::numeric > 0, (v_delivery->>'assembly')::numeric,
    (v_delivery->>'removal_seats') is not null, (v_delivery->>'removal_seats')::smallint,
    (v_delivery->>'removal')::numeric,
    v_delivery->'area'->>'name', coalesce((v_delivery->>'area_fee')::numeric, 0),
    (v_delivery->>'total')::numeric,
    (v_price->>'total_amount')::numeric, (v_price->>'has_made_to_order')::boolean,
    case when p_input->>'tracking_consent' in ('granted', 'denied') then p_input->>'tracking_consent' else 'unknown' end,
    public.try_uuid(v_attr->>'visitor_id'), public.try_uuid(v_attr->>'session_id'), public.try_uuid(v_attr->>'arrival_id'),
    public.clean_text(v_attr->>'gclid', 300), public.clean_text(v_attr->>'gbraid', 300),
    public.clean_text(v_attr->>'wbraid', 300), public.clean_text(v_attr->>'fbclid', 500),
    public.clean_text(v_attr->>'utm_source', 200), public.clean_text(v_attr->>'utm_medium', 200),
    public.clean_text(v_attr->>'utm_campaign', 200), public.clean_text(v_attr->>'utm_content', 200),
    public.clean_text(v_attr->>'utm_term', 200),
    public.clean_text(v_attr->>'landing_page', 500), public.clean_text(v_attr->>'referrer', 500),
    public.clean_text(v_attr->>'ga_client_id', 100), public.clean_text(v_attr->>'meta_fbp', 200),
    public.clean_text(v_attr->>'meta_fbc', 500),
    public.clean_text(p_input->>'customer_ip', 64), public.clean_text(p_input->>'customer_user_agent', 400)
  )
  returning id, reference, order_number into v_id, v_ref, v_number;

  insert into public.order_items (
    order_id, position, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
    material_id, material_code, material_name, material_collection, customisation
  )
  select v_id, l.line_no, l.variant_id, l.product_id, l.quantity, l.unit_price, l.title, l.trade_title, l.sku,
         l.colour_name, l.material_id, l.material_code, l.material_name, l.material_collection, l.customisation
  from public.order_lines(p_input->'items') l;

  return jsonb_build_object('id', v_id, 'reference', v_ref, 'order_number', v_number) || v_price;
end;
$function$;

-- Staff changing the delivery charge by hand replaces the breakdown, area included.
create or replace function private.update_order_details(p_order_id uuid, p_input jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_order public.orders%rowtype;
  v_address text;
  v_postcode text;
  v_class jsonb;
  v_date date;
  v_subtotal numeric(10,2);
  v_has_mto boolean;
  v_delivery numeric(10,2);
  v_delivery_changed boolean;
  v_total numeric(10,2);
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'ORDER_CANCELLED' using errcode = 'check_violation';
  end if;

  v_address := coalesce(public.clean_text(p_input->>'shipping_address', 400), v_order.shipping_address);
  v_postcode := coalesce(
    nullif(public.normalise_postcode(p_input->>'postcode'), ''),
    public.postcode_from_text(public.clean_text(p_input->>'shipping_address', 400)),
    v_order.postcode
  );
  v_class := public.classify_postcode(v_postcode, p_input->>'mixed_area_evidence');
  if v_class->>'kind' = 'invalid' then
    raise exception 'INVALID_POSTCODE' using errcode = 'check_violation';
  end if;

  if p_input ? 'preferred_delivery_date' then
    if nullif(p_input->>'preferred_delivery_date', '') is null then
      v_date := null;
    else
      begin
        v_date := (p_input->>'preferred_delivery_date')::date;
      exception when others then
        raise exception 'BAD_DELIVERY_DATE' using errcode = 'check_violation';
      end;
    end if;
  else
    v_date := v_order.preferred_delivery_date;
  end if;

  if p_input ? 'items' then
    drop table if exists pg_temp._kept;
    create temp table _kept on commit drop as
      select * from public.order_items where order_id = p_order_id;

    delete from public.order_items where order_id = p_order_id;

    insert into public.order_items (
      order_id, position, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
      material_id, material_code, material_name, material_collection, customisation, custom_title
    )
    select p_order_id, l.line_no, l.variant_id, l.product_id, l.quantity,
           case
             when (p_input->'items'->(l.line_no - 1))->>'unit_price' ~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then l.unit_price
             when k.id is not null and k.variant_id = l.variant_id
                  and k.material_id is not distinct from l.material_id then k.unit_price
             else l.catalogue_price
           end,
           case when k.variant_id = l.variant_id then k.title else l.title end,
           case when k.variant_id = l.variant_id then k.trade_title else l.trade_title end,
           case when k.variant_id = l.variant_id then k.sku else l.sku end,
           case when k.variant_id = l.variant_id then k.colour_name else l.colour_name end,
           l.material_id, l.material_code, l.material_name, l.material_collection,
           coalesce(l.customisation, k.customisation),
           case when l.sets_custom_title then l.custom_title else k.custom_title end
    from public.order_lines(p_input->'items', true, true) l
    left join _kept k on k.id = l.item_id;
  end if;

  select coalesce(sum(oi.unit_price * oi.quantity), 0),
         coalesce(bool_or(oi.material_id is not null or oi.customisation is not null), false)
           or coalesce(bool_or(p.made_to_order), false)
  into v_subtotal, v_has_mto
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = p_order_id;

  if p_input ? 'delivery_total' then
    begin
      v_delivery := round(least(greatest(coalesce((p_input->>'delivery_total')::numeric, 0), 0), 10000), 2);
    exception when others then
      raise exception 'BAD_DELIVERY_CHARGE' using errcode = 'check_violation';
    end;
  else
    v_delivery := v_order.delivery_total;
  end if;
  v_delivery_changed := v_delivery is distinct from v_order.delivery_total;
  v_total := greatest(0, v_subtotal - v_order.discount_amount) + v_delivery;

  update public.orders
  set customer_name = coalesce(public.clean_text(p_input->>'customer_name', 120), customer_name),
      customer_email = case when p_input ? 'customer_email'
                            then lower(public.clean_text(p_input->>'customer_email', 254)) else customer_email end,
      customer_phone = coalesce(public.clean_text(p_input->>'customer_phone', 30), customer_phone),
      shipping_address = v_address,
      postcode = v_class->>'postcode',
      delivery_zone = case when v_class->>'zone' = 'MAINLAND_STANDARD' then 'MAINLAND_STANDARD' else 'CUSTOM_QUOTE' end,
      special_instructions = case when p_input ? 'special_instructions'
                                  then public.clean_text(p_input->>'special_instructions', 1000) else special_instructions end,
      preferred_delivery_date = v_date,
      items_subtotal = v_subtotal,
      delivery_total = v_delivery,
      total_amount = v_total,
      has_made_to_order = v_has_mto,
      delivery_floor = case when v_delivery_changed then 0 else delivery_floor end,
      delivery_has_lift = case when v_delivery_changed then false else delivery_has_lift end,
      fee_upstairs = case when v_delivery_changed then 0 else fee_upstairs end,
      wants_assembly = case when v_delivery_changed then false else wants_assembly end,
      fee_assembly = case when v_delivery_changed then 0 else fee_assembly end,
      wants_removal = case when v_delivery_changed then false else wants_removal end,
      removal_seats = case when v_delivery_changed then null else removal_seats end,
      fee_removal = case when v_delivery_changed then 0 else fee_removal end,
      delivery_area = case when v_delivery_changed then null else delivery_area end,
      fee_area = case when v_delivery_changed then 0 else fee_area end
  where id = p_order_id;

  insert into public.order_events (order_id, kind, actor, note)
  values (p_order_id, 'details_updated', auth.uid(), public.clean_text(p_input->>'note', 300));

  return jsonb_build_object(
    'id', p_order_id,
    'items_subtotal', v_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_total
  );
end;
$function$;

-- The customer's own views of an order show the area charge.
create or replace function private.order_for_confirmation(p_order_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'status', o.status,
    'is_test', o.is_test,
    'created_at', o.created_at,
    'confirmed_at', o.confirmed_at,
    'cancelled_at', o.cancelled_at,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'shipping_address', o.shipping_address,
    'postcode', o.postcode,
    'special_instructions', o.special_instructions,
    'preferred_delivery_date', o.preferred_delivery_date,
    'has_made_to_order', o.has_made_to_order,
    'items_subtotal', o.items_subtotal,
    'discount_amount', o.discount_amount,
    'promotion_code', o.promotion_code,
    'delivery_floor', o.delivery_floor,
    'delivery_has_lift', o.delivery_has_lift,
    'fee_upstairs', o.fee_upstairs,
    'wants_assembly', o.wants_assembly,
    'fee_assembly', o.fee_assembly,
    'wants_removal', o.wants_removal,
    'removal_seats', o.removal_seats,
    'fee_removal', o.fee_removal,
    'delivery_area', o.delivery_area,
    'fee_area', o.fee_area,
    'delivery_total', o.delivery_total,
    'total_amount', o.total_amount,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', coalesce(oi.custom_title, oi.title),
        'colour_name', oi.colour_name,
        'material_name', oi.material_name,
        'material_collection', oi.material_collection,
        'customisation', oi.customisation,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ) order by oi.position, oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$function$;

create or replace function private.track_order(p_reference text, p_postcode text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_digits text := regexp_replace(regexp_replace(upper(coalesce(p_reference, '')), '^\s*HW', ''), '[^0-9]', '', 'g');
  v_postcode text := public.normalise_postcode(p_postcode);
  v_result jsonb;
begin
  if v_digits !~ '^[0-9]{6,9}$' or length(replace(v_postcode, ' ', '')) not between 5 and 7 then
    return null;
  end if;

  select jsonb_build_object(
    'reference', o.reference,
    'status', o.status,
    'created_at', o.created_at,
    'confirmed_at', o.confirmed_at,
    'processing_at', o.processing_at,
    'shipped_at', o.shipped_at,
    'delivered_at', o.delivered_at,
    'cancelled_at', o.cancelled_at,
    'preferred_delivery_date', o.preferred_delivery_date,
    'items_subtotal', o.items_subtotal,
    'discount_amount', o.discount_amount,
    'delivery_area', o.delivery_area,
    'fee_area', o.fee_area,
    'delivery_total', o.delivery_total,
    'total_amount', o.total_amount,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', coalesce(oi.custom_title, oi.title),
        'colour_name', oi.colour_name,
        'material_name', oi.material_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ) order by oi.position, oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders o
  where o.order_number = v_digits::bigint
    and o.postcode = v_postcode;

  return v_result;
end;
$function$;
