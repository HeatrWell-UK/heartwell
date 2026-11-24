-- Run 3 (owner, 24 November 2026): the Christmas and New Year season is live
-- from release, not 1 December. Applied after the storefront that explains
-- the 14-day window was live on Hostinger (commit 2e50f82). The end stays
-- 1 February 2027 00:00 UK time (= 00:00 UTC in winter); £50 per eligible piece.
update public.shop_settings
set event_enabled = true,
    event_starts_at = now(),
    updated_at = now()
where id and event_starts_at > now();
