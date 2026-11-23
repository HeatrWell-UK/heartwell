-- The Christmas and New Year sofa event (migration seasonal_event). Run on
-- heartwell-prod in one go, after the migration: it moves the event's dates
-- inside its own transaction to make it live now, prices real baskets, and
-- rolls itself back. The results come back in the closing error ("DRYRUN
-- {...}"): every value should read true.

do $$
declare
  r jsonb := '{}';
  v_oak uuid := (select pv.id from public.product_variants pv join public.products p on p.id = pv.product_id where p.slug = 'oakland-scattered-back-5-seater-corner' and pv.is_active order by pv.price_adjustment limit 1);
  v_han uuid := (select pv.id from public.product_variants pv join public.products p on p.id = pv.product_id where p.slug = 'hannah-electric-corner' and pv.is_active order by pv.price_adjustment limit 1);
  v_foot uuid := (select pv.id from public.product_variants pv join public.products p on p.id = pv.product_id where p.slug = 'sims-footstool' and pv.is_active order by pv.price_adjustment limit 1);
  v_oak_price numeric := (select p.base_price + pv.price_adjustment from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = v_oak);
  q jsonb;
begin
  -- The approved calendar as shipped.
  r := r || jsonb_build_object(
    'starts_1_dec_london', (select event_starts_at = timestamp '2026-12-01 00:00' at time zone 'Europe/London' from public.shop_settings where id),
    'ends_1_feb_london', (select event_ends_at = timestamp '2027-02-01 00:00' at time zone 'Europe/London' from public.shop_settings where id),
    'phase_30_nov', public.event_phase(timestamp '2026-11-30 23:59:59' at time zone 'Europe/London') is null,
    'phase_1_dec', public.event_phase(timestamp '2026-12-01 00:00:00' at time zone 'Europe/London') = 'christmas',
    'phase_24_dec', public.event_phase(timestamp '2026-12-24 23:59:59' at time zone 'Europe/London') = 'christmas',
    'phase_25_dec', public.event_phase(timestamp '2026-12-25 00:00:00' at time zone 'Europe/London') = 'year_end',
    'phase_31_dec', public.event_phase(timestamp '2026-12-31 23:59:59' at time zone 'Europe/London') = 'year_end',
    'phase_1_jan', public.event_phase(timestamp '2027-01-01 00:00:00' at time zone 'Europe/London') = 'new_year',
    'phase_31_jan', public.event_phase(timestamp '2027-01-31 23:59:59' at time zone 'Europe/London') = 'new_year',
    'phase_1_feb', public.event_phase(timestamp '2027-02-01 00:00:00' at time zone 'Europe/London') is null,
    'no_christmas_promise_yet', (select christmas_last_delivery_date is null and made_to_order_lead_days is null from public.shop_settings where id),
    'aliases', (select count(*) = 2 from public.offer_codes where is_event_alias and code in ('CHRISTMAS', 'NEWYEAR'))
  );

  -- Before 1 December nothing changes.
  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 1))));
  r := r || jsonb_build_object('before_event_no_discount', (q->>'discount_amount')::numeric = 0);

  -- Live now (inside this transaction only).
  update public.shop_settings set event_starts_at = now() - interval '1 day' where id;
  update public.offer_codes set valid_from = now() - interval '1 day' where code in ('CHRISTMAS', 'NEWYEAR');
  update public.offer_codes set valid_until = now() + interval '1 day' where code = 'CHRISTMAS';
  update public.offer_codes set valid_from = now() + interval '1 day' where code = 'NEWYEAR';

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 1))));
  r := r || jsonb_build_object('mto_50_off', (q->>'discount_amount')::numeric = 50 and q->>'offer_source' = 'event' and (q->>'total_amount')::numeric = v_oak_price - 50);

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 2))));
  r := r || jsonb_build_object('two_mto_100_off', (q->>'discount_amount')::numeric = 100);

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_han, 'quantity', 1))));
  r := r || jsonb_build_object('imported_alone_unchanged', (q->>'discount_amount')::numeric = 0);

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 1), jsonb_build_object('variant_id', v_han, 'quantity', 1)), 'promotion_code', 'HEARTSOFA'));
  r := r || jsonb_build_object('mixed_event_plus_tier', (q->>'discount_amount')::numeric = 100 and q->>'offer_source' = 'event');

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_foot, 'quantity', 1))));
  r := r || jsonb_build_object('excluded_footstool', (q->>'discount_amount')::numeric = 0);

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 1)), 'promotion_code', 'CHRISTMAS'));
  r := r || jsonb_build_object('christmas_alias_no_extra', (q->>'discount_amount')::numeric = 50 and q->>'promotion_code' = 'CHRISTMAS');

  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 1)), 'promotion_code', 'NEWYEAR'));
  r := r || jsonb_build_object('newyear_outside_dates_ignored', (q->>'discount_amount')::numeric = 50 and q->>'promotion_code' is null);

  -- Switched off: back to the ordinary shop.
  update public.shop_settings set event_enabled = false where id;
  q := public.price_order(jsonb_build_object('items', jsonb_build_array(jsonb_build_object('variant_id', v_oak, 'quantity', 1))));
  r := r || jsonb_build_object('off_switch', (q->>'discount_amount')::numeric = 0);

  raise exception 'DRYRUN %', r;
end;
$$;
