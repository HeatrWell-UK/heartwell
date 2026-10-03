-- Business-rule tests for the order functions, run against a real database.
--
-- Everything happens inside one DO block that ends by raising
-- ALL_TESTS_PASSED, so every row it created is rolled back. Any failed check
-- raises TEST_FAILED with the check's name instead. Run it with the Supabase
-- SQL editor or the MCP execute_sql tool after applying migrations.

do $tests$
declare
  n integer := 0;
  v_type uuid; v_cat uuid; v_range uuid; v_coll uuid;
  v_prod_a uuid; v_prod_b uuid; v_var_a uuid; v_var_b uuid; v_mat uuid;
  v_admin uuid := gen_random_uuid();
  v_order jsonb; v_order2 jsonb; v_price jsonb; v_res jsonb;
  v_id uuid; v_ref text; v_ts timestamptz; v_ts2 timestamptz;
  v_token uuid; v_wa text; v_count integer;
  v_session uuid := gen_random_uuid();
  v_items jsonb; v_base jsonb; v_mats jsonb;
  v_today date := (now() at time zone 'Europe/London')::date;
begin
  -- ---- catalogue -------------------------------------------------------------
  insert into public.product_types (slug, name, name_plural, material_kinds)
  values ('test-sofa', 'Sofa', 'Sofas', '{fabric}') returning id into v_type;
  insert into public.categories (slug, name) values ('test-sofas', 'Sofas') returning id into v_cat;
  insert into public.ranges (slug, name, trade_name, axis2_name)
  values ('test-range', 'Aurora', 'Trade Aurora', 'Back style') returning id into v_range;
  insert into public.material_collections (slug, name, kind) values ('test-plush', 'Plush', 'fabric')
  returning id into v_coll;
  insert into public.materials (collection_id, code, name) values (v_coll, 'PL01', 'Plush Ruby') returning id into v_mat;
  insert into public.materials (collection_id, code, name)
  select v_coll, 'PL0' || g, 'Plush ' || g from generate_series(2, 7) g;

  insert into public.products (slug, title, product_type_id, range_id, primary_category_id, axis1_value,
                               base_price, made_to_order)
  values ('test-aurora-3', 'Aurora 3 Seater', v_type, v_range, v_cat, '3 Seater', 799, true)
  returning id into v_prod_a;
  insert into public.products (slug, title, product_type_id, primary_category_id, base_price, made_to_order)
  values ('test-stool', 'Footstool', v_type, v_cat, 499, false)
  returning id into v_prod_b;
  insert into public.product_variants (product_id, sku, colour_name) values (v_prod_a, 'TEST-A-1', 'Ruby')
  returning id into v_var_a;
  insert into public.product_variants (product_id, sku, colour_name, price_adjustment)
  values (v_prod_b, 'TEST-B-1', 'Grey', 50) returning id into v_var_b;
  insert into public.offer_codes (code) values ('TESTCODE');
  insert into public.offer_product_tiers values (v_prod_a, 'HIGH'), (v_prod_b, 'STANDARD');

  v_items := jsonb_build_array(
    jsonb_build_object('variant_id', v_var_a, 'quantity', 1),
    jsonb_build_object('variant_id', v_var_b, 'quantity', 2)
  );

  -- ---- delivery extras -------------------------------------------------------
  if ((public.quote_delivery(0, false, false, false, null))->>'total')::numeric <> 0 then
    raise exception 'TEST_FAILED: ground floor is free'; end if; n := n + 1;
  if ((public.quote_delivery(1, false, false, false, null))->>'upstairs')::numeric <> 20.00 then
    raise exception 'TEST_FAILED: first floor is 20'; end if; n := n + 1;
  if ((public.quote_delivery(3, false, false, false, null))->>'upstairs')::numeric <> 40.00 then
    raise exception 'TEST_FAILED: third floor without lift is 40'; end if; n := n + 1;
  if ((public.quote_delivery(3, true, false, false, null))->>'upstairs')::numeric <> 20.00 then
    raise exception 'TEST_FAILED: any floor with a lift is 20'; end if; n := n + 1;
  if ((public.quote_delivery(0, false, true, true, null))->>'total')::numeric <> 50.00 then
    raise exception 'TEST_FAILED: assembly 20 + default 3 seats removal 30'; end if; n := n + 1;
  if ((public.quote_delivery(0, false, false, true, 15))->>'removal')::numeric <> 100.00 then
    raise exception 'TEST_FAILED: removal seats capped at 10'; end if; n := n + 1;
  if ((public.quote_delivery(0, false, false, true, 0))->>'removal')::numeric <> 10.00 then
    raise exception 'TEST_FAILED: removal seats at least 1'; end if; n := n + 1;

  -- ---- pricing and offers ----------------------------------------------------
  v_price := public.price_order(jsonb_build_object('items', v_items));
  if (v_price->>'total_amount')::numeric <> 1897 then
    raise exception 'TEST_FAILED: 799 + 2 x 549 = 1897, got %', v_price->>'total_amount'; end if; n := n + 1;
  if (v_price->>'has_made_to_order')::boolean is not true then
    raise exception 'TEST_FAILED: made-to-order flag'; end if; n := n + 1;

  v_price := public.price_order(jsonb_build_object('items', v_items, 'promotion_code', ' testcode '));
  if (v_price->>'discount_amount')::numeric <> 50 or v_price->>'discount_tier' <> 'HIGH'
     or v_price->>'offer_source' <> 'manual_code' or (v_price->>'total_amount')::numeric <> 1847 then
    raise exception 'TEST_FAILED: code gives the HIGH tier, 50 off: %', v_price; end if; n := n + 1;

  v_price := public.price_order(jsonb_build_object('items', v_items, 'promotion_code', 'NOPE'));
  if (v_price->>'discount_amount')::numeric <> 0 then
    raise exception 'TEST_FAILED: unknown code gives nothing'; end if; n := n + 1;

  v_token := (public.issue_paid_offer_entitlement(gen_random_uuid(), 'meta_ads', null))->>'token';
  v_price := public.price_order(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('variant_id', v_var_b, 'quantity', 1)),
    'offer_entitlement_token', v_token));
  if (v_price->>'discount_amount')::numeric <> 20 or v_price->>'offer_source' <> 'paid_entitlement' then
    raise exception 'TEST_FAILED: ad-visitor token gives the STANDARD tier: %', v_price; end if; n := n + 1;

  v_price := public.price_order(jsonb_build_object(
    'items', v_items, 'extras', jsonb_build_object('floor', 2, 'assembly', true)));
  if (v_price->>'total_amount')::numeric <> 1897 + 30 + 20 then
    raise exception 'TEST_FAILED: extras added to the total: %', v_price->>'total_amount'; end if; n := n + 1;

  -- ---- placing an order ------------------------------------------------------
  v_base := jsonb_build_object(
    'customer_name', 'Test Customer', 'customer_phone', '07700 900123',
    'customer_email', 'Test@Example.com', 'shipping_address', '1 Test Street, Manchester',
    'postcode', 'm11ae', 'items', v_items, 'promotion_code', 'TESTCODE',
    'attribution', jsonb_build_object('session_id', v_session, 'utm_source', 'facebook', 'visitor_id', 'not-a-uuid'),
    'is_test', true
  );

  begin
    perform public.place_order(v_base || jsonb_build_object('expected_total', 1897));
    raise exception 'TEST_FAILED: price mismatch should stop the order';
  exception when check_violation then
    if sqlerrm not like 'PRICE_MISMATCH%' then raise exception 'TEST_FAILED: wrong error %', sqlerrm; end if;
  end; n := n + 1;

  begin
    perform public.place_order(v_base || jsonb_build_object('expected_total', 1847, 'postcode', 'BT1 1AA'));
    raise exception 'TEST_FAILED: Belfast should not use the online checkout';
  exception when check_violation then
    if sqlerrm <> 'NOT_MAINLAND: northern_ireland' then raise exception 'TEST_FAILED: wrong error %', sqlerrm; end if;
  end; n := n + 1;

  begin
    perform public.place_order(v_base || jsonb_build_object('expected_total', 1847, 'postcode', 'IV40 8AA'));
    raise exception 'TEST_FAILED: a mixed district without evidence must not check out';
  exception when check_violation then
    if sqlerrm <> 'NOT_MAINLAND: mixed_geography' then raise exception 'TEST_FAILED: wrong error %', sqlerrm; end if;
  end; n := n + 1;

  begin
    perform public.place_order(v_base || jsonb_build_object('expected_total', 1847,
      'preferred_delivery_date', to_char(v_today + 1, 'YYYY-MM-DD')));
    raise exception 'TEST_FAILED: a delivery day tomorrow is too soon';
  exception when check_violation then
    if sqlerrm not like 'DELIVERY_DATE_TOO_SOON%' then raise exception 'TEST_FAILED: wrong error %', sqlerrm; end if;
  end; n := n + 1;

  begin
    perform public.place_order(v_base || jsonb_build_object('expected_total', 549 * 2 - 20,
      'items', jsonb_build_array(jsonb_build_object('variant_id', v_var_b, 'quantity', 2, 'material_id', v_mat))));
    raise exception 'TEST_FAILED: a material on a ready-made piece';
  exception when check_violation then
    if sqlerrm not like 'UNAVAILABLE_MATERIAL%' then raise exception 'TEST_FAILED: wrong error %', sqlerrm; end if;
  end; n := n + 1;

  -- Basket reminder from the same session, to be closed by the order.
  insert into public.basket_reminder_leads (visitor_id, session_id, arrival_id, email, email_opt_in, consent_copy_version)
  values (gen_random_uuid(), v_session, gen_random_uuid(), 'lead@example.com', true, 'test-v1');

  v_order := public.place_order(v_base || jsonb_build_object(
    'expected_total', 1847,
    'preferred_delivery_date', to_char(v_today + 10, 'YYYY-MM-DD'),
    'items', jsonb_build_array(
      jsonb_build_object('variant_id', v_var_a, 'quantity', 1, 'material_id', v_mat),
      jsonb_build_object('variant_id', v_var_b, 'quantity', 2))));
  v_id := (v_order->>'id')::uuid;
  v_ref := v_order->>'reference';
  if v_ref !~ '^HW-[0-9]{6}$' then raise exception 'TEST_FAILED: reference format %', v_ref; end if; n := n + 1;

  select count(*) into v_count from public.orders o
  where o.id = v_id and o.status = 'pending_cod' and o.postcode = 'M1 1AE' and o.customer_email = 'test@example.com'
    and o.total_amount = 1847 and o.discount_amount = 50 and o.is_test and o.utm_source = 'facebook'
    and o.visitor_id is null and o.confirmed_at is null;
  if v_count <> 1 then raise exception 'TEST_FAILED: stored order is wrong'; end if; n := n + 1;

  select count(*) into v_count from public.order_items oi
  where oi.order_id = v_id and oi.position = 1 and oi.title = 'Aurora 3 Seater' and oi.trade_title = 'Trade Aurora'
    and oi.sku = 'TEST-A-1' and oi.material_name = 'Plush Ruby' and oi.unit_price = 799;
  if v_count <> 1 then raise exception 'TEST_FAILED: line snapshot is wrong'; end if; n := n + 1;

  if not exists (select 1 from public.order_events where order_id = v_id and kind = 'placed') then
    raise exception 'TEST_FAILED: placed event'; end if; n := n + 1;

  if not exists (select 1 from public.basket_reminder_leads where session_id = v_session
                 and status = 'converted' and email is null and converted_order_id = v_id) then
    raise exception 'TEST_FAILED: basket reminder closed and cleared'; end if; n := n + 1;

  -- Editing the catalogue never rewrites an old order.
  update public.products set title = 'Renamed' where id = v_prod_a;
  if (public.order_for_confirmation(v_id))->'items'->0->>'title' <> 'Aurora 3 Seater'
     or (public.order_for_confirmation(v_id))->'items'->1->>'title' <> 'Footstool' then
    raise exception 'TEST_FAILED: confirm page keeps the ordered titles, in basket order'; end if; n := n + 1;

  -- ---- confirmation ---------------------------------------------------------
  v_res := public.confirm_order(v_id);
  if v_res->>'status' <> 'confirmed' or (v_res->>'just_confirmed')::boolean is not true then
    raise exception 'TEST_FAILED: confirm %', v_res; end if; n := n + 1;
  select confirmed_at into v_ts from public.orders where id = v_id;
  if (select confirmed_by from public.orders where id = v_id) <> 'customer' then
    raise exception 'TEST_FAILED: confirmed by the customer'; end if; n := n + 1;

  v_res := public.confirm_order(v_id);
  select confirmed_at into v_ts2 from public.orders where id = v_id;
  if (v_res->>'just_confirmed')::boolean or v_ts2 <> v_ts then
    raise exception 'TEST_FAILED: confirming twice changes nothing'; end if; n := n + 1;

  update public.orders set confirmed_at = '2000-01-01' where id = v_id;
  if (select confirmed_at from public.orders where id = v_id) <> v_ts then
    raise exception 'TEST_FAILED: timestamps are stamped once'; end if; n := n + 1;

  -- ---- tracking -------------------------------------------------------------
  if (public.track_order(lower(v_ref), 'm1 1ae'))->>'status' <> 'confirmed' then
    raise exception 'TEST_FAILED: track by reference and postcode'; end if; n := n + 1;
  if public.track_order(v_ref, 'M1 1AF') is not null then
    raise exception 'TEST_FAILED: wrong postcode finds nothing'; end if; n := n + 1;
  if (public.track_order(v_ref, 'M11AE')) ? 'customer_name' then
    raise exception 'TEST_FAILED: tracking shows no personal details'; end if; n := n + 1;

  -- ---- staff tools ----------------------------------------------------------
  begin
    perform public.set_order_status(v_id, 'processing', null);
    raise exception 'TEST_FAILED: status change without being an admin';
  exception when insufficient_privilege then null;
  end; n := n + 1;

  insert into auth.users (id, email, email_confirmed_at, aud, role)
  values (v_admin, 'admin-test@example.com', now(), 'authenticated', 'authenticated');
  insert into public.admins (email) values ('admin-test@example.com');
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  if public.is_admin() then raise exception 'TEST_FAILED: not an admin before claiming'; end if; n := n + 1;
  if not public.claim_admin() then raise exception 'TEST_FAILED: claim admin'; end if; n := n + 1;

  perform public.set_order_status(v_id, 'processing', null);
  select processing_at into v_ts from public.orders where id = v_id;
  perform public.set_order_status(v_id, 'shipped', null);
  perform public.set_order_status(v_id, 'processing', null);
  if (select processing_at from public.orders where id = v_id) <> v_ts then
    raise exception 'TEST_FAILED: correcting a status keeps the first timestamp'; end if; n := n + 1;
  perform public.set_order_status(v_id, 'delivered', null);
  if (select delivered_at from public.orders where id = v_id) is null then
    raise exception 'TEST_FAILED: delivered stamped'; end if; n := n + 1;
  if (select count(*) from public.order_events where order_id = v_id and kind = 'status_changed'
      and actor = v_admin) <> 4 then
    raise exception 'TEST_FAILED: status changes are logged with the admin'; end if; n := n + 1;

  -- A manual order: Belfast (custom quote) is fine here, with a staff price and name.
  v_wa := (public.create_whatsapp_enquiry(jsonb_build_object(
    'page_context', 'product', 'product_id', v_prod_a,
    'attribution', jsonb_build_object('utm_campaign', 'autumn', 'fbclid', 'abc'))))->>'reference';
  if v_wa !~ '^HW-WA-[0-9]{6}-[A-Z0-9]{6}$' then raise exception 'TEST_FAILED: enquiry reference %', v_wa; end if; n := n + 1;

  v_order2 := public.place_manual_order(jsonb_build_object(
    'customer_name', 'Belfast Customer', 'customer_phone', '07700 900456',
    'shipping_address', '2 Test Road, Belfast BT1 1AA', 'delivery_charge', 60,
    'whatsapp_reference', lower(v_wa), 'is_test', true,
    'items', jsonb_build_array(jsonb_build_object(
      'variant_id', v_var_a, 'quantity', 1, 'unit_price', 650, 'custom_title', 'Aurora made to measure'))));
  select count(*) into v_count from public.orders o
  where o.id = (v_order2->>'id')::uuid and o.delivery_zone = 'CUSTOM_QUOTE' and o.postcode = 'BT1 1AA'
    and o.total_amount = 710 and o.utm_campaign = 'autumn' and o.whatsapp_reference = v_wa and o.source = 'whatsapp';
  if v_count <> 1 then raise exception 'TEST_FAILED: manual order %', v_order2; end if; n := n + 1;
  if not exists (select 1 from public.whatsapp_enquiries where reference = v_wa
                 and converted_order_id = (v_order2->>'id')::uuid) then
    raise exception 'TEST_FAILED: enquiry marked converted'; end if; n := n + 1;

  -- Editing: quantity up, the ordered price kept, the staff name kept.
  v_res := public.update_order_details((v_order2->>'id')::uuid, jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object(
      'item_id', (select id from public.order_items where order_id = (v_order2->>'id')::uuid),
      'variant_id', v_var_a, 'quantity', 2))));
  if (v_res->>'total_amount')::numeric <> 650 * 2 + 60 then
    raise exception 'TEST_FAILED: edit keeps the agreed price: %', v_res; end if; n := n + 1;
  if (select custom_title from public.order_items where order_id = (v_order2->>'id')::uuid) <> 'Aurora made to measure' then
    raise exception 'TEST_FAILED: edit keeps the staff name'; end if; n := n + 1;

  -- Cancelled is final; pending can't jump to shipped.
  perform public.set_order_status((v_order2->>'id')::uuid, 'cancelled', 'Changed mind');
  begin
    perform public.set_order_status((v_order2->>'id')::uuid, 'confirmed', null);
    raise exception 'TEST_FAILED: cancelled is final';
  exception when check_violation then null;
  end; n := n + 1;

  v_order2 := public.place_manual_order(jsonb_build_object(
    'customer_name', 'Another Customer', 'customer_phone', '07700 900789',
    'shipping_address', '3 Test Lane, Leeds LS1 1AA', 'is_test', true,
    'items', jsonb_build_array(jsonb_build_object('variant_id', v_var_b, 'quantity', 1))));
  begin
    perform public.set_order_status((v_order2->>'id')::uuid, 'shipped', null);
    raise exception 'TEST_FAILED: an unconfirmed order cannot ship';
  exception when check_violation then null;
  end; n := n + 1;

  -- ---- samples and reviews --------------------------------------------------
  select jsonb_agg(id) into v_mats from public.materials where collection_id = v_coll;
  begin
    perform public.request_samples(jsonb_build_object(
      'customer_name', 'Sample Person', 'customer_email', 's@example.com', 'postcode', 'LS1 1AA',
      'shipping_address', '4 Test Way, Leeds', 'material_ids', v_mats));
    raise exception 'TEST_FAILED: seven samples is over the limit';
  exception when check_violation then
    if sqlerrm not like 'SAMPLE_LIMIT%' then raise exception 'TEST_FAILED: wrong error %', sqlerrm; end if;
  end; n := n + 1;

  insert into public.reviews (product_id, order_id, customer_name, rating, is_approved)
  values (v_prod_a, v_id, 'Test', 4, true);
  if (select review_count from public.products where id = v_prod_a) <> 1 then
    raise exception 'TEST_FAILED: review stats'; end if; n := n + 1;

  -- ---- what the public can see ----------------------------------------------
  update public.products set is_active = false where id = v_prod_b;
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  select count(*) into v_count from public.products where slug in ('test-aurora-3', 'test-stool');
  if v_count <> 1 then raise exception 'TEST_FAILED: anon sees only active products (%)', v_count; end if; n := n + 1;
  begin
    select count(*) into v_count from public.orders;
    raise exception 'TEST_FAILED: anon must not read orders';
  exception when insufficient_privilege then null;
  end; n := n + 1;
  if (public.track_order(v_ref, 'M1 1AE')) is null then
    raise exception 'TEST_FAILED: anon can track with reference and postcode'; end if; n := n + 1;
  execute 'reset role';

  raise exception 'ALL_TESTS_PASSED: % checks', n;
end;
$tests$;
