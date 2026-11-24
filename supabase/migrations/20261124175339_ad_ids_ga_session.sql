-- Run 4 (24 November 2026): attribution the next Meta campaign can be read by.
--
-- 1. The visit keeps Meta's numeric campaign / ad set / ad IDs, utm_id and the
--    placement from the ad's URL parameters (first-party, advertising consent
--    only, written by /api/attribution). Digits only for IDs; placement is a code.
-- 2. The order keeps GA4's session ID (from the _ga_<stream> cookie, analytics
--    consent only), and the GA4 purchase sent at staff verification carries it,
--    so GA4 can join the purchase to the visit's session instead of "(not set)".

alter table public.attribution_sessions
  add column if not exists utm_id text check (utm_id is null or utm_id ~ '^[0-9]{1,25}$'),
  add column if not exists meta_campaign_id text check (meta_campaign_id is null or meta_campaign_id ~ '^[0-9]{1,25}$'),
  add column if not exists meta_adset_id text check (meta_adset_id is null or meta_adset_id ~ '^[0-9]{1,25}$'),
  add column if not exists meta_ad_id text check (meta_ad_id is null or meta_ad_id ~ '^[0-9]{1,25}$'),
  add column if not exists placement text check (placement is null or placement ~ '^[A-Za-z0-9_.-]{1,60}$');

create index if not exists attribution_sessions_meta_ad_idx on public.attribution_sessions (meta_ad_id) where meta_ad_id is not null;

alter table public.orders
  add column if not exists ga_session_id text check (ga_session_id is null or ga_session_id ~ '^[0-9]{6,20}$');

-- conversions_due hands the sender each order's identifiers: add ga_session_id next to ga_client_id.
do $$
declare
  v_def text := pg_get_functiondef('private.conversions_due'::regproc);
  v_new text;
begin
  if position('''ga_session_id''' in v_def) > 0 then
    return;
  end if;
  v_new := replace(v_def, '''ga_client_id'', o.ga_client_id,', '''ga_client_id'', o.ga_client_id, ''ga_session_id'', o.ga_session_id,');
  if v_new = v_def then
    raise exception 'conversions_due: ga_client_id line not found';
  end if;
  execute v_new;
end $$;
