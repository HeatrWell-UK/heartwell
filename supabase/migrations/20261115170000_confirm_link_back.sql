-- Owner, 15 November 2026 (later the same day): the shop's WhatsApp reply now
-- carries a link to the order's own page, where the customer reads every
-- detail, sees the order's current status and presses Confirm. That button
-- calls confirm_order with the order id as the secret, as it did before
-- migration purchase_manual_only revoked it, so the grant comes back. The
-- screen straight after checkout still has no button.

grant execute on function public.confirm_order(uuid) to anon, authenticated;
grant execute on function private.confirm_order(uuid) to anon, authenticated;
