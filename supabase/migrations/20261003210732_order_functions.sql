-- The order functions: the money authority.
--
-- The browser sends identities and quantities (which variant, how many, which
-- material, which delivery extras) and never a price. Everything below prices
-- from the catalogue and shop_settings:
--
--   order_lines           resolves and validates basket lines, with prices
--   calculate_order_offer the offer: a typed code or a live ad-visitor token
--   price_order           lines + offer + delivery extras = the total
--   place_order           the website checkout (server only, secret key)
--   confirm_order         the customer's confirm button (anyone with the link)
--   order_for_confirmation, track_order   what the customer may see
--   place_manual_order, update_order_details, set_order_status, set_order_test
--                         staff tools, admins only
--   create_whatsapp_enquiry  a reference for a WhatsApp button press
--
-- Errors are raised as UPPER_CASE codes the server turns into sentences.

-- ---------------------------------------------------------------------------
-- Basket lines

create or replace function public.order_lines(
  p_items jsonb,
  p_staff boolean default false,
  p_allow_inactive boolean default false
)
returns table (
  line_no integer,
  item_id uuid,
  variant_id uuid,
  product_id uuid,
  quantity integer,
  unit_price numeric(10,2),
  catalogue_price numeric(10,2),
  title text,
  trade_title text,
  sku text,
  colour_name text,
  material_id uuid,
  material_code text,
  material_name text,
  material_collection text,
  made_to_order boolean,
  customisation jsonb,
  sets_custom_title boolean,
  custom_title text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_bad text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_BASKET' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'TOO_MANY_LINES' using errcode = 'check_violation';
  end if;

  -- Every line names a real variant of a live product.
  select string_agg(coalesce(e.item->>'variant_id', '?'), ', ')
  into v_bad
  from jsonb_array_elements(p_items) as e(item)
  left join public.product_variants pv on pv.id = public.try_uuid(e.item->>'variant_id')
  left join public.products p on p.id = pv.product_id
  where pv.id is null
     or (not p_allow_inactive and (not pv.is_active or not p.is_active));

  if v_bad is not null then
    raise exception 'UNAVAILABLE_ITEMS: %', v_bad using errcode = 'check_violation';
  end if;

  -- A material must exist and, on the website, be live and allowed for the piece:
  -- made to order, and a material kind its product type can be made in.
  select string_agg(e.item->>'material_id', ', ')
  into v_bad
  from jsonb_array_elements(p_items) as e(item)
  join public.product_variants pv on pv.id = public.try_uuid(e.item->>'variant_id')
  join public.products p on p.id = pv.product_id
  join public.product_types t on t.id = p.product_type_id
  left join public.materials m on m.id = public.try_uuid(e.item->>'material_id')
  left join public.material_collections c on c.id = m.collection_id
  where nullif(e.item->>'material_id', '') is not null
    and (
      m.id is null
      or (not p_staff and (
            not m.is_active or not c.is_active
            or not p.made_to_order
            or not (c.kind = any (t.material_kinds))
          ))
    );

  if v_bad is not null then
    raise exception 'UNAVAILABLE_MATERIAL: %', v_bad using errcode = 'check_violation';
  end if;

  return query
  select
    e.ord::integer,
    public.try_uuid(e.item->>'item_id'),
    pv.id,
    p.id,
    case when e.item->>'quantity' ~ '^[0-9]{1,3}$'
         then least(greatest((e.item->>'quantity')::integer, 1), 99) else 1 end,
    case
      when p_staff and e.item->>'unit_price' ~ '^[0-9]{1,7}(\.[0-9]{1,2})?$'
        then round(least((e.item->>'unit_price')::numeric, 1000000), 2)
      else round(p.base_price + pv.price_adjustment + coalesce(c.surcharge, 0), 2)
    end::numeric(10,2),
    round(p.base_price + pv.price_adjustment + coalesce(c.surcharge, 0), 2)::numeric(10,2),
    p.title,
    coalesce(p.trade_title, r.trade_name),
    pv.sku,
    pv.colour_name,
    m.id,
    m.code,
    m.name,
    c.name,
    p.made_to_order or m.id is not null,
    case when jsonb_typeof(e.item->'customisation') = 'object' then e.item->'customisation' end,
    p_staff and e.item ? 'custom_title',
    case when p_staff then public.clean_text(e.item->>'custom_title', 120) end
  from jsonb_array_elements(p_items) with ordinality as e(item, ord)
  join public.product_variants pv on pv.id = public.try_uuid(e.item->>'variant_id')
  join public.products p on p.id = pv.product_id
  left join public.ranges r on r.id = p.range_id
  left join public.materials m on m.id = public.try_uuid(e.item->>'material_id')
  left join public.material_collections c on c.id = m.collection_id
  order by e.ord;
end;
$$;

revoke all on function public.order_lines(jsonb, boolean, boolean) from public, anon, authenticated;
grant execute on function public.order_lines(jsonb, boolean, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Offers

create or replace function public.calculate_order_offer(
  p_items jsonb,
  p_promotion_code text default null,
  p_offer_entitlement_token uuid default null
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_subtotal numeric(10,2);
  v_code text := nullif(upper(btrim(coalesce(p_promotion_code, ''))), '');
  v_code_valid boolean := false;
  v_entitlement_valid boolean := false;
  v_tier text;
  v_amount numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_source text;
begin
  select coalesce(sum(l.unit_price * l.quantity), 0) into v_subtotal
  from public.order_lines(p_items) l;

  if v_code is not null then
    select exists (select 1 from public.offer_codes oc where oc.code = v_code and oc.is_active)
    into v_code_valid;
  end if;

  if p_offer_entitlement_token is not null then
    select exists (
      select 1 from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token and oe.revoked_at is null and oe.expires_at > now()
    ) into v_entitlement_valid;
  end if;

  if v_code_valid or v_entitlement_valid then
    -- The order's best tier decides the amount.
    select opt.tier into v_tier
    from public.order_lines(p_items) l
    join public.offer_product_tiers opt on opt.product_id = l.product_id
    order by case opt.tier when 'HIGH' then 4 when 'MID' then 3 when 'STANDARD' then 2 else 1 end desc
    limit 1;

    select * into s from public.shop_settings where id;
    v_amount := case v_tier
      when 'HIGH' then s.offer_tier_high
      when 'MID' then s.offer_tier_mid
      when 'STANDARD' then s.offer_tier_standard
      else 0
    end;
    v_discount := least(v_subtotal, v_amount);
    -- A typed code wins the audit trail when both apply; the discount is the same.
    v_source := case when v_code_valid then 'manual_code' else 'paid_entitlement' end;
  end if;

  return jsonb_build_object(
    'items_subtotal', v_subtotal,
    'code_valid', v_code_valid,
    'entitlement_valid', v_entitlement_valid,
    'promotion_code', case when v_code_valid then v_code end,
    'discount_tier', v_tier,
    'discount_amount', v_discount,
    'offer_source', v_source
  );
end;
$$;

revoke all on function public.calculate_order_offer(jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.calculate_order_offer(jsonb, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- The whole price of a basket. The checkout shows this; place_order charges it.

create or replace function public.price_order(p_input jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_offer jsonb;
  v_delivery jsonb;
  v_extras jsonb := coalesce(p_input->'extras', '{}'::jsonb);
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
$$;

revoke all on function public.price_order(jsonb) from public, anon, authenticated;
grant execute on function public.price_order(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Website checkout
--
-- Called by the checkout's server action with the secret key, after it has
-- resolved the postcode (including the address lookup for the two mixed
-- Scottish districts). The database classifies the postcode again itself and
-- refuses anything outside the free UK Mainland checkout.

create or replace function public.place_order(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_name text := public.clean_text(p_input->>'customer_name', 120);
  v_phone text := public.clean_text(p_input->>'customer_phone', 30);
  v_email text := lower(public.clean_text(p_input->>'customer_email', 254));
  v_address text := public.clean_text(p_input->>'shipping_address', 400);
  v_class jsonb := public.classify_postcode(p_input->>'postcode', p_input->>'mixed_area_evidence');
  v_attr jsonb := coalesce(p_input->'attribution', '{}'::jsonb);
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

  -- The day the customer asked for, measured against today in the UK.
  if nullif(p_input->>'preferred_delivery_date', '') is not null then
    begin
      v_date := (p_input->>'preferred_delivery_date')::date;
    exception when others then
      raise exception 'BAD_DELIVERY_DATE' using errcode = 'check_violation';
    end;
    select * into s from public.shop_settings where id;
    if v_date < v_today + s.preferred_date_min_days then
      raise exception 'DELIVERY_DATE_TOO_SOON: earliest is %', v_today + s.preferred_date_min_days
        using errcode = 'check_violation';
    end if;
    if v_date > v_today + s.preferred_date_max_days then
      raise exception 'DELIVERY_DATE_TOO_FAR: latest is %', v_today + s.preferred_date_max_days
        using errcode = 'check_violation';
    end if;
  end if;

  v_price := public.price_order(p_input);
  v_delivery := v_price->'delivery';

  -- The page showed a total; if prices or the offer changed since, stop and re-quote.
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
    wants_removal, removal_seats, fee_removal, delivery_total, total_amount, has_made_to_order,
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
    (v_delivery->>'removal')::numeric, (v_delivery->>'total')::numeric,
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
    order_id, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
    material_id, material_code, material_name, material_collection, customisation
  )
  select v_id, l.variant_id, l.product_id, l.quantity, l.unit_price, l.title, l.trade_title, l.sku, l.colour_name,
         l.material_id, l.material_code, l.material_name, l.material_collection, l.customisation
  from public.order_lines(p_input->'items') l;

  return jsonb_build_object('id', v_id, 'reference', v_ref, 'order_number', v_number) || v_price;
end;
$$;

revoke all on function public.place_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_order(jsonb) to service_role;

comment on function public.place_order(jsonb) is
  'Website checkout. Server only (secret key), after server-side postcode resolution. Never called from the browser.';

-- ---------------------------------------------------------------------------
-- The customer's confirm button (POST from /confirm-order/[id])

create or replace function public.confirm_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed integer;
  v_result jsonb;
begin
  update public.orders
  set status = 'confirmed', confirmed_by = 'customer'
  where id = p_order_id and status = 'pending_cod';
  get diagnostics v_changed = row_count;

  select jsonb_build_object(
    'id', o.id,
    'reference', o.reference,
    'status', o.status,
    'confirmed_at', o.confirmed_at,
    'just_confirmed', v_changed > 0
  )
  into v_result
  from public.orders o
  where o.id = p_order_id;

  return v_result;
end;
$$;

revoke all on function public.confirm_order(uuid) from public;
grant execute on function public.confirm_order(uuid) to anon, authenticated, service_role;

-- What the confirm page shows. The order id is the secret in the link.
create or replace function public.order_for_confirmation(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
      ) order by oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

revoke all on function public.order_for_confirmation(uuid) from public;
grant execute on function public.order_for_confirmation(uuid) to anon, authenticated, service_role;

-- The tracking page: reference plus postcode, and no personal details back.
create or replace function public.track_order(p_reference text, p_postcode text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    'delivery_total', o.delivery_total,
    'total_amount', o.total_amount,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', coalesce(oi.custom_title, oi.title),
        'colour_name', oi.colour_name,
        'material_name', oi.material_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ) order by oi.created_at, oi.id)
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
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- WhatsApp

create or replace function public.create_whatsapp_enquiry(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attr jsonb := coalesce(p_input->'attribution', '{}'::jsonb);
  v_ref text;
begin
  insert into public.whatsapp_enquiries (
    visitor_id, session_id, arrival_id, page_url, page_context,
    product_id, variant_id, product_name,
    gclid, gbraid, wbraid, fbclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    ga_client_id, meta_fbp, meta_fbc, is_test
  )
  values (
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
  returning reference into v_ref;

  return jsonb_build_object('reference', v_ref);
end;
$$;

revoke all on function public.create_whatsapp_enquiry(jsonb) from public, anon, authenticated;
grant execute on function public.create_whatsapp_enquiry(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Staff tools (admins only)

create or replace function public.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

revoke all on function public.require_admin() from public, anon;
grant execute on function public.require_admin() to authenticated, service_role;

-- An order agreed on WhatsApp or the phone. Non-mainland addresses are fine
-- here: this is where a custom delivery quote becomes an order. Staff may set
-- a line's price and name; the delivery charge is the one agreed in the chat.
create or replace function public.place_manual_order(p_input jsonb)
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
  v_enquiry public.whatsapp_enquiries%rowtype;
  v_has_enquiry boolean := false;
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

  -- A day agreed by the shop: not in the past, within a year.
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

  if v_wa_ref is not null then
    select * into v_enquiry from public.whatsapp_enquiries where reference = v_wa_ref;
    v_has_enquiry := found;
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
    coalesce((p_input->>'is_test') = 'true', false) or coalesce(v_enquiry.is_test, false),
    public.clean_text(p_input->>'test_reason', 200),
    v_name, v_email, v_phone, v_address, v_class->>'postcode',
    case when v_class->>'zone' = 'MAINLAND_STANDARD' then 'MAINLAND_STANDARD' else 'CUSTOM_QUOTE' end,
    public.clean_text(p_input->>'special_instructions', 1000), v_date,
    v_subtotal, v_delivery, v_subtotal + v_delivery, v_has_mto,
    v_enquiry.visitor_id, v_enquiry.session_id, v_enquiry.arrival_id,
    v_enquiry.gclid, v_enquiry.gbraid, v_enquiry.wbraid, v_enquiry.fbclid,
    v_enquiry.utm_source, v_enquiry.utm_medium, v_enquiry.utm_campaign, v_enquiry.utm_content, v_enquiry.utm_term,
    v_enquiry.ga_client_id, v_enquiry.meta_fbp, v_enquiry.meta_fbc,
    coalesce(v_enquiry.reference, v_wa_ref)
  )
  returning id, reference into v_id, v_ref;

  insert into public.order_items (
    order_id, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
    material_id, material_code, material_name, material_collection, customisation, custom_title
  )
  select v_id, l.variant_id, l.product_id, l.quantity, l.unit_price, l.title, l.trade_title, l.sku, l.colour_name,
         l.material_id, l.material_code, l.material_name, l.material_collection, l.customisation, l.custom_title
  from public.order_lines(p_input->'items', true) l;

  if v_has_enquiry then
    update public.whatsapp_enquiries
    set converted_order_id = v_id, converted_at = now()
    where id = v_enquiry.id;
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

revoke all on function public.place_manual_order(jsonb) from public, anon;
grant execute on function public.place_manual_order(jsonb) to authenticated, service_role;

-- Correct an order: customer details, lines, the agreed delivery charge.
-- Lines are matched to existing ones by item_id; a kept line keeps its
-- customisation, its name and price as ordered unless staff change them.
create or replace function public.update_order_details(p_order_id uuid, p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
      order_id, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
      material_id, material_code, material_name, material_collection, customisation, custom_title
    )
    select p_order_id, l.variant_id, l.product_id, l.quantity,
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
      -- A new agreed delivery figure replaces the itemised extras.
      delivery_floor = case when v_delivery_changed then 0 else delivery_floor end,
      delivery_has_lift = case when v_delivery_changed then false else delivery_has_lift end,
      fee_upstairs = case when v_delivery_changed then 0 else fee_upstairs end,
      wants_assembly = case when v_delivery_changed then false else wants_assembly end,
      fee_assembly = case when v_delivery_changed then 0 else fee_assembly end,
      wants_removal = case when v_delivery_changed then false else wants_removal end,
      removal_seats = case when v_delivery_changed then null else removal_seats end,
      fee_removal = case when v_delivery_changed then 0 else fee_removal end
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
$$;

revoke all on function public.update_order_details(uuid, jsonb) from public, anon;
grant execute on function public.update_order_details(uuid, jsonb) to authenticated, service_role;

create or replace function public.set_order_status(p_order_id uuid, p_status text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();

  update public.orders
  set status = p_status,
      confirmed_by = case when status = 'pending_cod' and p_status = 'confirmed' then 'staff' else confirmed_by end,
      cancellation_reason = case when p_status = 'cancelled'
                                 then coalesce(public.clean_text(p_reason, 300), cancellation_reason)
                                 else cancellation_reason end
  where id = p_order_id;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select jsonb_build_object(
    'id', o.id, 'reference', o.reference, 'status', o.status,
    'confirmed_at', o.confirmed_at, 'processing_at', o.processing_at, 'shipped_at', o.shipped_at,
    'delivered_at', o.delivered_at, 'cancelled_at', o.cancelled_at
  ) into v_result
  from public.orders o where o.id = p_order_id;

  return v_result;
end;
$$;

revoke all on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.set_order_status(uuid, text, text) to authenticated, service_role;

create or replace function public.set_order_test(p_order_id uuid, p_is_test boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();

  update public.orders
  set is_test = coalesce(p_is_test, false),
      test_reason = case when coalesce(p_is_test, false) then public.clean_text(p_reason, 200) else null end
  where id = p_order_id;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on function public.set_order_test(uuid, boolean, text) from public, anon;
grant execute on function public.set_order_test(uuid, boolean, text) to authenticated, service_role;
