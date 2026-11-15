-- Owner, 15 November 2026:
--   1. Purchase events go to Meta only when staff press a button. The setting
--      had allowed "automatic after a hold" (D1); it is now manual for good:
--      the value is set, the default follows, and the admin no longer offers
--      the choice. The outbox trigger (migration tracking) already holds a
--      confirmed order's Purchase when the mode is manual.
--   2. Orders are confirmed in conversation (WhatsApp, phone, email), then
--      marked confirmed by staff. The customer's one-tap confirm_order button
--      is gone from the site, so anyone holding an order link can no longer
--      confirm it; the function stays for the server's key only.

update public.shop_settings set purchase_mode = 'manual', purchase_hold_minutes = 0 where id = true;
alter table public.shop_settings alter column purchase_mode set default 'manual';
alter table public.shop_settings alter column purchase_hold_minutes set default 0;

revoke execute on function public.confirm_order(uuid) from anon, authenticated;
revoke execute on function private.confirm_order(uuid) from anon, authenticated;
