-- Owner, 24 November 2026 (Run 2): one Christmas and New Year event,
-- 1 December 2026 00:00 to 31 January 2027 23:59:59 (Europe/London), ending
-- by itself on 1 February 2027.
--
--   * £50 off EACH made-to-order sofa (per unit, never more than the line
--     costs), for every visitor, no code needed. Pieces the shop already
--     excludes from offers (tier EXCLUDED: the Sims Footstool) are left out. List prices are not touched
--     and no was-price is created: the saving is against today's real price.
--   * Imported pieces keep their tier offer (HIGH £50 / MID £30 / STANDARD £20)
--     for ad visitors and codes, and the £20 welcome offer per piece.
--   * Nothing stacks. Two plans are worked out and the one that takes more off
--     wins:
--       A. the shop as before: the order's best tier (code or ad visit) OR the
--          welcome offer on every piece;
--       B. the event: £50 on each made-to-order unit, plus, for the pieces that
--          are NOT made to order, the better of their tier offer or their
--          welcome offer.
--     So every unit carries at most one promotion.
--   * CHRISTMAS (1–24 December) and NEWYEAR (25 December – 31 January) are
--     aliases of the event: typing one is recorded, never adds anything.
--     Codes can now carry dates; a code outside its dates is not valid.
--   * Christmas delivery: the shop's real last delivery day, closed days and
--     made-to-order lead time are owner facts that are NOT known yet, so they
--     are nullable here and the site promises nothing until they are set.
--
-- Past orders keep the amounts they were placed with (orders store them).

-- 1. The event's settings --------------------------------------------------------

alter table public.shop_settings
  add column event_enabled boolean not null default true,
  add column event_name text not null default 'Christmas and New Year sofa event'
    check (length(event_name) between 3 and 80),
  add column event_starts_at timestamptz not null default (timestamp '2026-12-01 00:00:00' at time zone 'Europe/London'),
  -- Exclusive end: the event is live while now() < event_ends_at.
  add column event_ends_at timestamptz not null default (timestamp '2027-02-01 00:00:00' at time zone 'Europe/London'),
  add column event_mto_amount numeric(10,2) not null default 50
    check (event_mto_amount >= 0 and event_mto_amount <= 500),
  -- Owner facts, unknown until set: no Christmas promise is shown while null.
  add column christmas_last_delivery_date date,
  add column christmas_closed_dates date[] not null default '{}',
  add column made_to_order_lead_days smallint
    check (made_to_order_lead_days is null or made_to_order_lead_days between 0 and 120),
  add constraint shop_settings_event_dates check (event_ends_at > event_starts_at);

comment on column public.shop_settings.event_ends_at is 'Exclusive: the event is live while now() < event_ends_at (1 Feb 2027 00:00 London = ends after 31 Jan).';
comment on column public.shop_settings.christmas_last_delivery_date is 'Owner fact. Null = not verified: the site makes no Christmas delivery promise.';
comment on column public.shop_settings.made_to_order_lead_days is 'Owner fact. Null = not verified: made-to-order pieces make no Christmas promise.';

-- 2. Dated codes and the two aliases ----------------------------------------------

alter table public.offer_codes
  add column valid_from timestamptz,
  add column valid_until timestamptz,
  -- An alias gives the event's offer (and nothing on its own outside it).
  add column is_event_alias boolean not null default false,
  add constraint offer_codes_dates check (valid_until is null or valid_from is null or valid_until > valid_from);

insert into public.offer_codes (code, label, is_active, valid_from, valid_until, is_event_alias)
values
  ('CHRISTMAS', 'Christmas sofa event (1–24 December)', true,
    timestamp '2026-12-01 00:00:00' at time zone 'Europe/London',
    timestamp '2026-12-25 00:00:00' at time zone 'Europe/London', true),
  ('NEWYEAR', 'Boxing week and New Year sofa event (25 December – 31 January)', true,
    timestamp '2026-12-25 00:00:00' at time zone 'Europe/London',
    timestamp '2027-02-01 00:00:00' at time zone 'Europe/London', true)
on conflict (code) do nothing;

-- 3. The event's offer is a source of its own --------------------------------------

alter table public.orders drop constraint orders_offer_source_check;
alter table public.orders add constraint orders_offer_source_check
  check (offer_source is null or offer_source in ('manual_code', 'paid_entitlement', 'welcome', 'event'));

-- 4. Which part of the season it is (London calendar) --------------------------------

create or replace function public.event_phase(p_at timestamptz default now())
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when not s.event_enabled or p_at < s.event_starts_at or p_at >= s.event_ends_at then null
    -- November counts as the Christmas run-up (if the event is ever started early).
    when extract(month from (p_at at time zone 'Europe/London')) = 11 then 'christmas'
    when extract(month from (p_at at time zone 'Europe/London')) = 12
         and extract(day from (p_at at time zone 'Europe/London')) < 25 then 'christmas'
    when extract(month from (p_at at time zone 'Europe/London')) = 12 then 'year_end'
    else 'new_year'
  end
  from public.shop_settings s where s.id
$$;

-- House rule: new public functions start revoked; the server calls it with its key.
revoke execute on function public.event_phase(timestamptz) from public, anon, authenticated;

-- 5. The offer: one per unit, the best plan for the customer ------------------------

create or replace function public.calculate_order_offer(
  p_items jsonb,
  p_promotion_code text default null,
  p_offer_entitlement_token uuid default null,
  p_welcome_token uuid default null
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_now timestamptz := now();
  v_subtotal numeric(10,2);
  v_pieces integer;
  v_code text := nullif(upper(btrim(coalesce(p_promotion_code, ''))), '');
  v_code_row public.offer_codes%rowtype;
  v_code_valid boolean := false;      -- a tier code (HEARTSOFA)
  v_alias_valid boolean := false;     -- CHRISTMAS / NEWYEAR inside their dates
  v_entitlement_valid boolean := false;
  v_welcome_ends timestamptz;
  v_event_live boolean;
  v_phase text;
  -- Plan A (the shop without the event)
  v_tier text;
  v_tier_amount numeric(10,2) := 0;
  v_welcome_amount numeric(10,2) := 0;
  v_plan_a numeric(10,2) := 0;
  v_plan_a_source text;
  -- Plan B (the event)
  v_event_amount numeric(10,2) := 0;
  v_event_units integer := 0;
  v_rest_subtotal numeric(10,2) := 0;
  v_rest_pieces integer := 0;
  v_rest_tier text;
  v_rest_tier_amount numeric(10,2) := 0;
  v_rest_welcome numeric(10,2) := 0;
  v_rest_amount numeric(10,2) := 0;
  v_rest_source text;
  v_plan_b numeric(10,2) := 0;
  -- Result
  v_discount numeric(10,2) := 0;
  v_source text;
  v_result_tier text;
  v_result_code text;
begin
  select coalesce(sum(l.unit_price * l.quantity), 0), coalesce(sum(l.quantity), 0)::integer
  into v_subtotal, v_pieces
  from public.order_lines(p_items) l;

  select * into s from public.shop_settings where id;

  v_event_live := s.event_enabled and v_now >= s.event_starts_at and v_now < s.event_ends_at and s.event_mto_amount > 0;
  v_phase := public.event_phase(v_now);

  if v_code is not null then
    select * into v_code_row
    from public.offer_codes oc
    where oc.code = v_code and oc.is_active
      and (oc.valid_from is null or v_now >= oc.valid_from)
      and (oc.valid_until is null or v_now < oc.valid_until);
    if found then
      if v_code_row.is_event_alias then
        v_alias_valid := v_event_live;
      else
        v_code_valid := true;
      end if;
    end if;
  end if;

  if p_offer_entitlement_token is not null then
    select exists (
      select 1 from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token and oe.revoked_at is null and oe.expires_at > v_now
    ) into v_entitlement_valid;
  end if;

  if p_welcome_token is not null and s.welcome_offer_enabled then
    select wo.expires_at into v_welcome_ends
    from public.welcome_offers wo
    where wo.token = p_welcome_token and wo.expires_at > v_now;
  end if;

  -- Plan A: as before the event.
  if v_code_valid or v_entitlement_valid then
    select opt.tier into v_tier
    from public.order_lines(p_items) l
    join public.offer_product_tiers opt on opt.product_id = l.product_id
    order by case opt.tier when 'HIGH' then 4 when 'MID' then 3 when 'STANDARD' then 2 else 1 end desc
    limit 1;
    v_tier_amount := least(v_subtotal, case v_tier
      when 'HIGH' then s.offer_tier_high
      when 'MID' then s.offer_tier_mid
      when 'STANDARD' then s.offer_tier_standard
      else 0 end);
  end if;
  if v_welcome_ends is not null then
    v_welcome_amount := least(v_subtotal, s.welcome_offer_amount * v_pieces);
  end if;
  if (v_code_valid or v_entitlement_valid) and v_tier_amount >= v_welcome_amount and v_tier_amount > 0 then
    v_plan_a := v_tier_amount;
    v_plan_a_source := case when v_code_valid then 'manual_code' else 'paid_entitlement' end;
  elsif v_welcome_amount > 0 then
    v_plan_a := v_welcome_amount;
    v_plan_a_source := 'welcome';
  end if;

  -- Plan B: the event, made-to-order units first, the other pieces as before.
  if v_event_live then
    -- Eligible: made to order, and not a piece the shop excludes from offers
    -- (offer_product_tiers EXCLUDED, e.g. the Sims Footstool).
    select
      coalesce(sum(least(l.unit_price * l.quantity, s.event_mto_amount * l.quantity)) filter (where e.eligible), 0),
      coalesce(sum(l.quantity) filter (where e.eligible), 0)::integer,
      coalesce(sum(l.unit_price * l.quantity) filter (where not e.eligible), 0),
      coalesce(sum(l.quantity) filter (where not e.eligible), 0)::integer
    into v_event_amount, v_event_units, v_rest_subtotal, v_rest_pieces
    from public.order_lines(p_items) l
    left join public.offer_product_tiers opt on opt.product_id = l.product_id
    cross join lateral (select l.made_to_order and coalesce(opt.tier, '') <> 'EXCLUDED' as eligible) e;

    if v_rest_pieces > 0 then
      if v_code_valid or v_entitlement_valid then
        select opt.tier into v_rest_tier
        from public.order_lines(p_items) l
        join public.offer_product_tiers opt on opt.product_id = l.product_id
        where not (l.made_to_order and opt.tier <> 'EXCLUDED')
        order by case opt.tier when 'HIGH' then 4 when 'MID' then 3 when 'STANDARD' then 2 else 1 end desc
        limit 1;
        v_rest_tier_amount := least(v_rest_subtotal, case v_rest_tier
          when 'HIGH' then s.offer_tier_high
          when 'MID' then s.offer_tier_mid
          when 'STANDARD' then s.offer_tier_standard
          else 0 end);
      end if;
      if v_welcome_ends is not null then
        v_rest_welcome := least(v_rest_subtotal, s.welcome_offer_amount * v_rest_pieces);
      end if;
      if (v_code_valid or v_entitlement_valid) and v_rest_tier_amount >= v_rest_welcome and v_rest_tier_amount > 0 then
        v_rest_amount := v_rest_tier_amount;
        v_rest_source := case when v_code_valid then 'manual_code' else 'paid_entitlement' end;
      elsif v_rest_welcome > 0 then
        v_rest_amount := v_rest_welcome;
        v_rest_source := 'welcome';
      end if;
    end if;
    v_plan_b := v_event_amount + v_rest_amount;
  end if;

  -- The better plan wins; a tie goes to the event when it takes anything off
  -- (it is the simpler story to show the customer).
  if v_event_live and v_event_amount > 0 and v_plan_b >= v_plan_a then
    v_discount := v_plan_b;
    v_source := 'event';
    v_result_tier := case when v_rest_source in ('manual_code', 'paid_entitlement') then v_rest_tier end;
    v_result_code := case when v_alias_valid then v_code when v_rest_source = 'manual_code' then v_code end;
  elsif v_plan_a > 0 then
    v_discount := v_plan_a;
    v_source := v_plan_a_source;
    v_result_tier := case when v_plan_a_source in ('manual_code', 'paid_entitlement') then v_tier end;
    v_result_code := case when v_plan_a_source = 'manual_code' then v_code end;
  end if;

  return jsonb_build_object(
    'items_subtotal', v_subtotal,
    'pieces', v_pieces,
    'code_valid', v_code_valid or v_alias_valid,
    'code_is_event_alias', v_alias_valid,
    'entitlement_valid', v_entitlement_valid,
    'welcome_valid', v_welcome_ends is not null,
    'welcome_ends_at', v_welcome_ends,
    'welcome_amount', v_welcome_amount,
    'code_amount', v_tier_amount,
    'event_live', v_event_live,
    'event_phase', v_phase,
    'event_name', case when v_event_live then s.event_name end,
    'event_ends_at', case when v_event_live then s.event_ends_at end,
    'event_amount', case when v_source = 'event' then v_event_amount else 0 end,
    'event_units', case when v_source = 'event' then v_event_units else 0 end,
    'rest_amount', case when v_source = 'event' then v_rest_amount else 0 end,
    'rest_source', case when v_source = 'event' then v_rest_source end,
    'promotion_code', v_result_code,
    'discount_tier', v_result_tier,
    'discount_amount', v_discount,
    'offer_source', v_source
  );
end;
$$;

-- create or replace keeps the existing grants (server key only).
