-- Staff-verified Purchases (migration purchase_staff_verified). Run on
-- heartwell-prod in one go, after the migration: test orders only, as the
-- admin, rolled back. Results in the closing error ("DRYRUN {...}"): every
-- value should read true.

do $$
declare
  v_admin uuid := (select user_id from public.admins where user_id is not null limit 1);
  v_a uuid := (select id from public.orders where is_test and status = 'pending_cod' order by created_at limit 1);
  v_b uuid := (select id from public.orders where is_test and status = 'pending_cod' order by created_at desc limit 1);
  r jsonb := '{}';
  v_row public.conversion_outbox%rowtype;
begin
  -- History: sent Purchases for orders later held or cancelled carry a note.
  r := r || jsonb_build_object('history_noted',
    not exists (select 1 from public.conversion_outbox c join public.orders o on o.id = c.order_id
                where c.status = 'sent' and c.event_name = 'Purchase' and (o.status = 'cancelled' or o.held_at is not null) and c.note is null));

  -- A customer's own Confirm queues nothing.
  perform public.confirm_order(v_a);
  r := r || jsonb_build_object('customer_confirm_queues_nothing', not exists (select 1 from public.conversion_outbox where order_id = v_a));

  -- Staff verify: queued (a test order flows as pending; a real one is held for Send).
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.verify_order(v_a, 'Spoke to them');
  reset role;
  r := r || jsonb_build_object('verify_queues_purchase', exists (select 1 from public.conversion_outbox where order_id = v_a and event_name = 'Purchase'),
                               'verify_logged', exists (select 1 from public.order_events where order_id = v_a and kind = 'verified'));

  -- Staff Mark confirmed counts as verified.
  set local role authenticated;
  perform public.set_order_status(v_b, 'confirmed', null);
  reset role;
  r := r || jsonb_build_object('staff_confirm_verifies', (select staff_verified_at is not null from public.orders where id = v_b),
                               'staff_confirm_queues', exists (select 1 from public.conversion_outbox where order_id = v_b and event_name = 'Purchase'));

  -- Pretend v_b's Purchase was sent, then hold the order: the row is noted, never resent or deleted.
  update public.conversion_outbox set status = 'sent', sent_at = now() where order_id = v_b and event_name = 'Purchase';
  set local role authenticated;
  perform public.set_order_hold(v_b, true, 'Can''t reach the customer');
  reset role;
  select * into v_row from public.conversion_outbox where order_id = v_b and event_name = 'Purchase';
  r := r || jsonb_build_object('sent_then_held_noted', v_row.status = 'sent' and v_row.note = 'sent_then_held');

  -- Send now refuses an unverified order.
  update public.orders set staff_verified_at = null where id = v_a;
  begin
    set local role authenticated;
    perform public.admin_outbox_action((select id from public.conversion_outbox where order_id = v_a and event_name = 'Purchase'), 'send_now');
    reset role;
    r := r || '{"unverified_send_refused": false}';
  exception when others then
    reset role;
    r := r || jsonb_build_object('unverified_send_refused', sqlerrm like 'NOT_VERIFIED%');
  end;

  -- Anonymous callers can't verify.
  begin
    set local role anon;
    perform public.verify_order(v_a, null);
    reset role;
    r := r || '{"anon_refused": false}';
  exception when others then
    reset role;
    r := r || '{"anon_refused": true}';
  end;

  raise exception 'DRYRUN %', r;
end;
$$;
