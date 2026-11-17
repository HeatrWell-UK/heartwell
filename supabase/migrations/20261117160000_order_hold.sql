-- Simpler order stages and a Hold (owner, 17 November 2026).
--
-- Staff work with three stages: Waiting (pending_cod), Confirmed and Delivered,
-- plus Cancelled and the test flag. Processing and On its way are no longer
-- used: nothing can move into them (no order ever has), though old values stay
-- valid so history and OrderFlow's words don't change.
--
-- Hold is for a customer staff can't reach, or who asked to wait until they're
-- sure. It's a mark on a Waiting order, not a stage of its own: holding a
-- confirmed order moves it back to Waiting (OrderFlow then sees pending_cod, so
-- the warehouse doesn't deliver it). Confirming or cancelling clears the hold.
-- Held orders stay on Waiting, so the customer's own Confirm still works once
-- they're sure; the hold and its reason are never shown to the customer.

alter table public.orders
  add column held_at timestamptz,
  add column hold_reason text;

comment on column public.orders.held_at is 'When staff put the order on hold (still Waiting). Cleared when it is confirmed, cancelled or released.';
comment on column public.orders.hold_reason is 'Why it is on hold, for staff only (cannot reach them, customer asked to wait).';

create index orders_held_idx on public.orders (held_at) where held_at is not null;

alter table public.order_events drop constraint order_events_kind_check;
alter table public.order_events add constraint order_events_kind_check
  check (kind in ('placed', 'status_changed', 'details_updated', 'test_flag_changed', 'note', 'held', 'hold_released'));

-- Waiting → Confirmed → Delivered. Any open order can be cancelled; a delivered
-- order can be put back to Confirmed (a correction); cancelled is final. Moving
-- a confirmed order back to Waiting happens only through a hold (the trigger).
create or replace function public.order_status_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = p_to then true
    when p_from = 'pending_cod' then p_to in ('confirmed', 'cancelled')
    when p_from = 'confirmed' then p_to in ('delivered', 'cancelled')
    when p_from = 'delivered' then p_to in ('confirmed', 'cancelled')
    -- Old stages (never used): may only move on to the three that remain.
    when p_from in ('processing', 'shipped') then p_to in ('confirmed', 'delivered', 'cancelled')
    else false
  end;
$$;

create or replace function public.orders_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Every order starts unconfirmed, whoever creates it.
    new.status := 'pending_cod';
    new.confirmed_at := null;
    new.confirmed_by := null;
    new.processing_at := null;
    new.shipped_at := null;
    new.delivered_at := null;
    new.cancelled_at := null;
    new.held_at := null;
    new.hold_reason := null;
    new.postcode := public.normalise_postcode(new.postcode);
    return new;
  end if;

  -- A hold takes a confirmed order back to Waiting; nothing else may.
  if not (old.status = 'confirmed' and new.status = 'pending_cod' and new.held_at is not null)
     and not public.order_status_allowed(old.status, new.status) then
    raise exception 'BAD_STATUS_CHANGE: % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Timestamps are the trigger's alone: keep what was stamped, stamp the step
  -- being entered for the first time.
  new.confirmed_at := old.confirmed_at;
  new.processing_at := old.processing_at;
  new.shipped_at := old.shipped_at;
  new.delivered_at := old.delivered_at;
  new.cancelled_at := old.cancelled_at;
  new.created_at := old.created_at;
  new.order_number := old.order_number;
  new.purchase_event_id := old.purchase_event_id;
  -- Who confirmed is recorded once, at the moment of confirmation.
  if old.confirmed_by is not null or old.status <> 'pending_cod' or new.status <> 'confirmed' then
    new.confirmed_by := old.confirmed_by;
  end if;

  -- Only a Waiting order can be on hold: moving on clears it.
  if new.status <> 'pending_cod' then
    new.held_at := null;
    new.hold_reason := null;
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'confirmed' then
        new.confirmed_at := coalesce(old.confirmed_at, now());
        new.confirmed_by := coalesce(new.confirmed_by, 'staff');
      when 'processing' then new.processing_at := coalesce(old.processing_at, now());
      when 'shipped' then new.shipped_at := coalesce(old.shipped_at, now());
      when 'delivered' then new.delivered_at := coalesce(old.delivered_at, now());
      when 'cancelled' then new.cancelled_at := coalesce(old.cancelled_at, now());
      else null;
    end case;
  end if;

  new.postcode := public.normalise_postcode(new.postcode);
  new.updated_at := now();
  return new;
end;
$$;

-- Put an order on hold (with a reason) or release it. Holding a confirmed
-- order moves it back to Waiting; releasing leaves it Waiting, ready to confirm.
create function private.set_order_hold(p_order_id uuid, p_hold boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := public.clean_text(p_reason, 300);
  v_order public.orders%rowtype;
begin
  perform public.require_admin();

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if p_hold then
    if v_order.status not in ('pending_cod', 'confirmed') then
      raise exception 'HOLD_NOT_OPEN' using errcode = 'check_violation';
    end if;
    if v_reason is null then
      raise exception 'HOLD_REASON_NEEDED' using errcode = 'check_violation';
    end if;
    update public.orders
    set status = 'pending_cod', held_at = coalesce(held_at, now()), hold_reason = v_reason
    where id = p_order_id;
    insert into public.order_events (order_id, kind, actor, note)
    values (p_order_id, 'held', auth.uid(),
            v_reason || case when v_order.status = 'confirmed' then ' (was confirmed, moved back to Waiting)' else '' end);
  else
    if v_order.held_at is null then
      raise exception 'NOT_ON_HOLD' using errcode = 'check_violation';
    end if;
    update public.orders set held_at = null, hold_reason = null where id = p_order_id;
    insert into public.order_events (order_id, kind, actor, note)
    values (p_order_id, 'hold_released', auth.uid(), v_reason);
  end if;

  return (
    select jsonb_build_object('id', o.id, 'reference', o.reference, 'status', o.status, 'held_at', o.held_at, 'hold_reason', o.hold_reason)
    from public.orders o where o.id = p_order_id
  );
end;
$$;

revoke all on function private.set_order_hold(uuid, boolean, text) from public, anon, authenticated;
-- Admins call it through the wrapper; it checks require_admin() itself.
grant execute on function private.set_order_hold(uuid, boolean, text) to authenticated, service_role;

create function public.set_order_hold(p_order_id uuid, p_hold boolean, p_reason text default null)
returns jsonb
language sql
set search_path = ''
as $$ select private.set_order_hold(p_order_id, p_hold, p_reason) $$;

revoke all on function public.set_order_hold(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.set_order_hold(uuid, boolean, text) to authenticated, service_role;
