-- Run 2 follow-up (found by supabase/tests/purchase_staff_verified.sql): staff
-- confirming a TEST order must still count as verified, so test orders keep
-- flowing to the outbox as test events (they never go live), as before.
create or replace function private.stamp_staff_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.staff_verified_at is null and (
       (new.status = 'confirmed' and old.status is distinct from 'confirmed' and new.confirmed_by = 'staff')
    or (new.status = 'delivered' and old.status is distinct from 'delivered')
  ) then
    new.staff_verified_at := now();
    new.staff_verified_by := auth.uid();
  end if;
  return new;
end;
$$;
