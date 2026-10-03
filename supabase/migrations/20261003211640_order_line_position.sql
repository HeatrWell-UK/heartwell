-- Order lines keep the order the customer put them in.
--
-- Lines inserted together share a timestamp, so sorting by it left their
-- order to chance: a confirm page, an email and OrderFlow could each list the
-- same order differently. Every line now carries its position in the basket,
-- and everything that shows lines sorts by it.

alter table public.order_items
  add column position smallint not null default 1 check (position between 1 and 99);

create index order_items_order_position_idx on public.order_items (order_id, position);
drop index public.order_items_order_idx;

-- ---------------------------------------------------------------------------
-- Writers

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
    order_id, position, variant_id, product_id, quantity, unit_price, title, trade_title, sku, colour_name,
    material_id, material_code, material_name, material_collection, customisation
  )
  select v_id, l.line_no, l.variant_id, l.product_id, l.quantity, l.unit_price, l.title, l.trade_title, l.sku,
         l.colour_name, l.material_id, l.material_code, l.material_name, l.material_collection, l.customisation
  from public.order_lines(p_input->'items') l;

  return jsonb_build_object('id', v_id, 'reference', v_ref, 'order_number', v_number) || v_price;
end;
$$;

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

create or replace function private.update_order_details(p_order_id uuid, p_input jsonb)
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

-- ---------------------------------------------------------------------------
-- Readers

create or replace function private.order_for_confirmation(p_order_id uuid)
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
      ) order by oi.position, oi.created_at, oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

create or replace function private.track_order(p_reference text, p_postcode text)
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
$$;

create or replace function orderflow.order_payload(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'external_id', o.id::text,
    'reference', o.reference,
    'shop', 'heartwell',
    'status', o.status,
    'placed_at', to_jsonb(o.created_at),
    'postcode', o.postcode,
    'delivery_date', to_char(o.preferred_delivery_date, 'YYYY-MM-DD'),
    'total', round(o.total_amount, 2),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
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
