-- A deposit paid before delivery (owner, 6 November 2026).
--
-- Staff took a £100 deposit on HW-100113 and lowered the order's total by
-- hand, so the driver would collect the rest. That also told Meta and Google
-- the sale was £669 instead of £769. Now the total stays the sale, and the
-- deposit is its own figure:
--
-- 1. orders.deposit_paid (0 to the order's total). What's left to collect is
--    total_amount - deposit_paid.
-- 2. Staff set it when taking a WhatsApp or phone order (place_manual_order)
--    or later on the order page (set_order_deposit); each is written to the
--    order's history.
-- 3. OrderFlow's total is what the driver collects, so it's sent after the
--    deposit (the same figure staff gave it by hand), and a deposit change
--    sends the order again. Orders without a deposit send what they always did.
-- 4. The customer's confirm and track pages get the deposit, so they show
--    what's left to pay.
-- 5. Meta's and Google's Purchase keep using total_amount: the full sale.
-- 6. HW-100113 put right: sale £769, deposit £100, still £669 to collect (what
--    OrderFlow and the driver already have). Its Purchase already went to
--    Meta with £669 and can't be changed.

-- 1. The deposit -----------------------------------------------------------------------

alter table public.orders
  add column deposit_paid numeric(10,2) not null default 0
    constraint orders_deposit_paid_check check (deposit_paid >= 0);

-- 2a. Taking a WhatsApp or phone order with a deposit ---------------------------------
--
-- As before (visit_finder), plus deposit_paid: never more than the order's total.

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
  v_deposit numeric(10,2);
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

  begin
    v_deposit := round(greatest(coalesce(nullif(p_input->>'deposit_paid', '')::numeric, 0), 0), 2);
  exception when others then
    raise exception 'BAD_DEPOSIT' using errcode = 'check_violation';
  end;
  if v_deposit > v_subtotal + v_delivery then
    raise exception 'DEPOSIT_TOO_HIGH' using errcode = 'check_violation';
  end if;

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
    items_subtotal, delivery_total, total_amount, deposit_paid, has_made_to_order,
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
    v_subtotal, v_delivery, v_subtotal + v_delivery, v_deposit, v_has_mto,
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

  if v_deposit > 0 then
    insert into public.order_events (order_id, kind, actor, note)
    values (v_id, 'note', auth.uid(), 'Deposit paid: £' || to_char(v_deposit, 'FM999990.00'));
  end if;

  return jsonb_build_object(
    'id', v_id,
    'reference', v_ref,
    'items_subtotal', v_subtotal,
    'delivery_total', v_delivery,
    'total_amount', v_subtotal + v_delivery,
    'deposit_paid', v_deposit,
    'to_collect', v_subtotal + v_delivery - v_deposit,
    'delivery_zone', case when v_class->>'zone' = 'MAINLAND_STANDARD' then 'MAINLAND_STANDARD' else 'CUSTOM_QUOTE' end
  );
end;
$$;

-- 2b. Setting or changing the deposit on a saved order ---------------------------------

create function private.set_order_deposit(p_order_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_amount numeric(10,2) := round(coalesce(p_amount, 0), 2);
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'ORDER_CANCELLED' using errcode = 'check_violation';
  end if;
  if v_amount < 0 then
    raise exception 'BAD_DEPOSIT' using errcode = 'check_violation';
  end if;
  if v_amount > v_order.total_amount then
    raise exception 'DEPOSIT_TOO_HIGH' using errcode = 'check_violation';
  end if;
  if v_amount = v_order.deposit_paid then
    return jsonb_build_object('deposit_paid', v_amount, 'to_collect', v_order.total_amount - v_amount, 'changed', false);
  end if;

  update public.orders set deposit_paid = v_amount where id = p_order_id;

  insert into public.order_events (order_id, kind, actor, note)
  values (p_order_id, 'note', auth.uid(),
          case when v_amount = 0 then 'Deposit removed (was £' || to_char(v_order.deposit_paid, 'FM999990.00') || ')'
               else 'Deposit paid: £' || to_char(v_amount, 'FM999990.00')
                    || case when v_order.deposit_paid > 0 then ' (was £' || to_char(v_order.deposit_paid, 'FM999990.00') || ')' else '' end
          end);

  return jsonb_build_object('deposit_paid', v_amount, 'to_collect', v_order.total_amount - v_amount, 'changed', true);
end;
$$;

create function public.set_order_deposit(p_order_id uuid, p_amount numeric)
returns jsonb language sql set search_path = ''
as $$ select private.set_order_deposit(p_order_id, p_amount) $$;

revoke all on function private.set_order_deposit(uuid, numeric), public.set_order_deposit(uuid, numeric)
from public, anon, authenticated;

-- Staff only (checked inside with require_admin()).
grant execute on function private.set_order_deposit(uuid, numeric), public.set_order_deposit(uuid, numeric)
to authenticated, service_role;

-- 3. OrderFlow: its total is what the driver collects ------------------------------------

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
    -- What's left to pay on delivery: after any offer and any deposit paid.
    'total', round(o.total_amount - o.deposit_paid, 2),
    'items', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               -- The warehouse knows the trade name; a staff-typed name wins.
               'product_name', coalesce(oi.custom_title, oi.trade_title, oi.title),
               'sku', oi.sku,
               'variant', case
                 when oi.material_name is not null then
                   oi.material_name
                   || coalesce(', ' || oi.material_collection, '')
                   || coalesce(' (' || oi.material_code || ')', '')
                 else oi.colour_name
               end,
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

revoke all on function orderflow.order_payload(uuid) from public, anon, authenticated;

-- A deposit change sends the order again, like a total change.
drop trigger orderflow_push_on_update on public.orders;
create trigger orderflow_push_on_update
  after update of status, preferred_delivery_date, total_amount, deposit_paid, shipping_address, postcode, is_test
  on public.orders
  for each row execute function orderflow.orders_changed();

-- HW-100113 put right, now that OrderFlow's total allows for a deposit: its lines
-- and delivery come to £769 and £100 was paid, so OrderFlow is sent the same
-- £669 it already has.
update public.orders
set total_amount = items_subtotal + delivery_total - discount_amount,
    deposit_paid = 100
where reference = 'HW-100113'
  and total_amount = 669
  and items_subtotal + delivery_total - discount_amount = 769;

alter table public.orders
  add constraint orders_deposit_within_total check (deposit_paid <= total_amount);

-- 4. The customer's own views show what's left to pay ------------------------------------

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
    'deposit_paid', o.deposit_paid,
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
    'deposit_paid', o.deposit_paid,
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
