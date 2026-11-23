-- Owner, 24 November 2026 (Run 2): a Meta/GA4 Purchase may only come from an
-- order staff have really verified (a conversation or a call), never from a
-- customer pressing Confirm on their own link (HW-100127…100135 confirmed in
-- 2–16 seconds; several were later held or cancelled, after their Purchase
-- had reached Meta).
--
--   * orders.staff_verified_at/by: stamped when staff mark an order confirmed
--     (set_order_status) or press Verify on a customer-confirmed order
--     (verify_order), or when it is delivered (paid in full: the strongest
--     proof). Stamped once.
--   * The outbox trigger queues Purchase/purchase only for a verified,
--     confirmed (or delivered) order. Manual mode still holds them for the
--     Send button. Consent and the 7-day limit are still checked at send time
--     (src/lib/tracking/conversions.ts).
--   * Send now refuses an unverified order (admin_outbox_action).
--   * When an order whose Purchase was already SENT is put on hold or
--     cancelled, the row gets a note (sent_then_held / sent_then_cancelled).
--     Meta has no way to withdraw an accepted event, so nothing is resent or
--     deleted: the note is what the admin shows. Existing such orders are
--     noted now (HW-100118, HW-100129, HW-100131, HW-100132 at the time of
--     writing).

-- 1. Verification on the order ----------------------------------------------------

alter table public.order_events drop constraint order_events_kind_check;
alter table public.order_events add constraint order_events_kind_check
  check (kind in ('placed', 'status_changed', 'details_updated', 'test_flag_changed', 'note', 'held', 'hold_released', 'verified'));

alter table public.orders
  add column staff_verified_at timestamptz,
  add column staff_verified_by uuid;

comment on column public.orders.staff_verified_at is 'When staff verified the order in conversation (or it was delivered). Purchase signals need it.';

-- Staff confirmations already in the data count as verified (confirmed_by = staff),
-- and so do delivered orders.
update public.orders
set staff_verified_at = coalesce(confirmed_at, now())
where staff_verified_at is null and not is_test and confirmed_by = 'staff';
update public.orders
set staff_verified_at = coalesce(delivered_at, now())
where staff_verified_at is null and not is_test and status = 'delivered';

-- 2. Notes on the outbox ------------------------------------------------------------

alter table public.conversion_outbox
  add column note text check (note is null or note in ('sent_then_held', 'sent_then_cancelled')),
  add column noted_at timestamptz;

update public.conversion_outbox c
set note = case when o.status = 'cancelled' then 'sent_then_cancelled' else 'sent_then_held' end,
    noted_at = now()
from public.orders o
where o.id = c.order_id and c.status = 'sent' and c.note is null
  and c.event_name in ('Purchase', 'purchase')
  and (o.status = 'cancelled' or o.held_at is not null);

-- 3. Stamping verification ------------------------------------------------------------

create or replace function private.stamp_staff_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.staff_verified_at is null and not new.is_test and (
       (new.status = 'confirmed' and old.status is distinct from 'confirmed' and new.confirmed_by = 'staff')
    or (new.status = 'delivered' and old.status is distinct from 'delivered')
  ) then
    new.staff_verified_at := now();
    new.staff_verified_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger orders_stamp_staff_verified
before update of status on public.orders
for each row execute function private.stamp_staff_verified();

-- 4. Queueing only verified orders -----------------------------------------------------

create or replace function private.enqueue_conversions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_verified_now boolean;
begin
  select * into s from public.shop_settings where id;

  -- Became queue-worthy now: verified and confirmed/delivered, and wasn't before.
  v_verified_now := new.staff_verified_at is not null
    and new.status in ('confirmed', 'delivered')
    and (old.staff_verified_at is null or old.status not in ('confirmed', 'delivered'));

  if v_verified_now then
    insert into public.conversion_outbox (order_id, platform, event_name, event_id, status, send_after)
    select new.id, v.platform, v.event_name, new.purchase_event_id::text,
      -- Manual mode holds real orders for staff; test orders always flow (they never go live).
      case when s.purchase_mode = 'manual' and not new.is_test then 'held' else 'pending' end,
      now() + make_interval(mins => case when new.is_test then 0 else s.purchase_hold_minutes end)
    from (values ('meta', 'Purchase'), ('ga4', 'purchase')) as v(platform, event_name)
    on conflict (order_id, platform, event_name) do nothing;
  end if;

  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    insert into public.conversion_outbox (order_id, platform, event_name, event_id, status, send_after)
    values (new.id, 'meta', 'OrderDelivered', 'delivered-' || new.purchase_event_id::text, 'pending', now())
    on conflict (order_id, platform, event_name) do nothing;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.conversion_outbox
    set status = 'skipped', skip_reason = 'order cancelled', lease_until = null
    where order_id = new.id and status in ('pending', 'held', 'failed');
    update public.conversion_outbox
    set note = 'sent_then_cancelled', noted_at = now()
    where order_id = new.id and status = 'sent' and event_name in ('Purchase', 'purchase');
  elsif new.held_at is not null and old.held_at is null then
    -- Put on hold: a waiting Purchase stays held (the button is hidden while
    -- on hold); a sent one gets the note.
    update public.conversion_outbox
    set note = 'sent_then_held', noted_at = now()
    where order_id = new.id and status = 'sent' and note is null and event_name in ('Purchase', 'purchase');
  end if;
  return null;
end;
$$;

drop trigger if exists orders_enqueue_conversions on public.orders;
create trigger orders_enqueue_conversions
after update of status, staff_verified_at, held_at on public.orders
for each row
when (old.status is distinct from new.status
   or old.staff_verified_at is distinct from new.staff_verified_at
   or old.held_at is distinct from new.held_at)
execute function private.enqueue_conversions();

-- 5. Staff verify a customer-confirmed order --------------------------------------------

create or replace function private.verify_order(p_order_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.require_admin();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.status not in ('confirmed', 'delivered') or v_order.held_at is not null then
    raise exception 'VERIFY_NOT_CONFIRMED' using errcode = 'check_violation';
  end if;
  if v_order.staff_verified_at is null then
    update public.orders set staff_verified_at = now(), staff_verified_by = auth.uid() where id = p_order_id;
    insert into public.order_events (order_id, kind, actor, note)
    values (p_order_id, 'verified', auth.uid(), coalesce(public.clean_text(p_note, 300), 'Verified by staff'));
  end if;
  return (select jsonb_build_object('id', o.id, 'reference', o.reference, 'staff_verified_at', o.staff_verified_at)
          from public.orders o where o.id = p_order_id);
end;
$$;

create or replace function public.verify_order(p_order_id uuid, p_note text default null)
returns jsonb
language sql
set search_path = ''
as $$ select private.verify_order(p_order_id, p_note) $$;

revoke execute on function private.verify_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.verify_order(uuid, text) from public, anon;
grant execute on function private.verify_order(uuid, text) to authenticated;
grant execute on function public.verify_order(uuid, text) to authenticated;

-- 6. Send now refuses unverified orders ----------------------------------------------------

create or replace function private.admin_outbox_action(p_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.conversion_outbox%rowtype;
  v_verified boolean;
begin
  perform public.require_admin();
  select * into v_row from public.conversion_outbox where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if p_action = 'send_now' then
    if v_row.status not in ('pending', 'held', 'failed') then
      raise exception 'NOT_WAITING' using errcode = 'check_violation';
    end if;
    select o.staff_verified_at is not null and o.held_at is null and o.status in ('confirmed', 'delivered')
    into v_verified
    from public.orders o where o.id = v_row.order_id;
    if not coalesce(v_verified, false) and v_row.event_name in ('Purchase', 'purchase') then
      raise exception 'NOT_VERIFIED' using errcode = 'check_violation';
    end if;
    update public.conversion_outbox
    set status = 'pending', send_after = now(), attempts = least(attempts, 5), error = null
    where id = p_id;
    perform private.start_site_job('conversions');
  elsif p_action = 'hold' then
    if v_row.status <> 'pending' then
      raise exception 'NOT_WAITING' using errcode = 'check_violation';
    end if;
    update public.conversion_outbox set status = 'held' where id = p_id;
  elsif p_action = 'skip' then
    if v_row.status not in ('pending', 'held', 'failed') then
      raise exception 'NOT_WAITING' using errcode = 'check_violation';
    end if;
    update public.conversion_outbox set status = 'skipped', skip_reason = 'skipped by staff', lease_until = null where id = p_id;
  else
    raise exception 'BAD_ACTION' using errcode = 'check_violation';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
