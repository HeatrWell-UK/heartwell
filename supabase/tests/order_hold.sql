-- Hold and the three stages (migration order_hold). Run on heartwell-prod in
-- one go: it works on test orders only, as the admin, and rolls itself back.
-- The results come back in the closing error ("DRYRUN {...}"): every value
-- should read true, or the refusal named.

do $$
declare
  v_admin uuid := (select user_id from public.admins where user_id is not null limit 1);
  v_c uuid := (select id from public.orders where is_test and status = 'confirmed' limit 1);
  v_w uuid := (select id from public.orders where is_test and status = 'pending_cod' limit 1);
  r jsonb := '{}';
  o public.orders%rowtype;
  v_conf timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select confirmed_at into v_conf from public.orders where id = v_c;

  -- Holding a confirmed order takes it back to Waiting; the first confirmation time is kept.
  perform public.set_order_hold(v_c, true, 'Can''t reach the customer');
  select * into o from public.orders where id = v_c;
  r := r || jsonb_build_object('held_back_to_waiting', o.status = 'pending_cod' and o.held_at is not null, 'confirmed_at_kept', o.confirmed_at = v_conf);

  -- Confirming again ends the hold.
  perform public.set_order_status(v_c, 'confirmed', null);
  select * into o from public.orders where id = v_c;
  r := r || jsonb_build_object('confirm_clears_hold', o.status = 'confirmed' and o.held_at is null and o.hold_reason is null);

  -- Confirmed can't go back to Waiting without a hold, nor into the old stages.
  begin
    update public.orders set status = 'pending_cod' where id = v_c;
    r := r || '{"back_without_hold_refused": false}';
  exception when others then r := r || '{"back_without_hold_refused": true}';
  end;
  begin
    perform public.set_order_status(v_c, 'processing', null);
    r := r || '{"processing_refused": false}';
  exception when others then r := r || '{"processing_refused": true}';
  end;

  -- A waiting order is held and released, staying Waiting.
  perform public.set_order_hold(v_w, true, 'Customer asked to wait');
  perform public.set_order_hold(v_w, false, null);
  select * into o from public.orders where id = v_w;
  r := r || jsonb_build_object('release_stays_waiting', o.status = 'pending_cod' and o.held_at is null);

  -- A reason is needed; a delivered order can't be held.
  begin
    perform public.set_order_hold(v_w, true, '  ');
  exception when others then r := r || jsonb_build_object('no_reason', sqlerrm);
  end;
  perform public.set_order_status(v_c, 'delivered', null);
  begin
    perform public.set_order_hold(v_c, true, 'x');
  exception when others then r := r || jsonb_build_object('delivered', sqlerrm);
  end;

  r := r || jsonb_build_object('events', (select count(*) from public.order_events where order_id in (v_c, v_w) and kind in ('held', 'hold_released')) = 3);

  -- The customer's own Confirm still works on a held order, and ends the hold.
  perform public.set_order_hold(v_w, true, 'Customer asked to wait');
  reset role;
  perform public.confirm_order(v_w);
  select * into o from public.orders where id = v_w;
  r := r || jsonb_build_object('customer_confirm_clears_hold', o.status = 'confirmed' and o.held_at is null);

  raise exception 'DRYRUN %', r;
end;
$$;
