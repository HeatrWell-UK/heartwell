-- Delivery rules, in the database.
--
-- The website shows these and the database charges them, so both sides must
-- give the same answer. src/lib/delivery/postcode.ts and pricing.ts hold the
-- TypeScript copies; tests/delivery-parity.test.ts runs both against the same
-- cases (tests/fixtures/delivery-parity.json, captured from this SQL).
--
-- Non-mainland addresses are not refused: they go to a WhatsApp quote, never
-- the online checkout.

-- ---------------------------------------------------------------------------
-- Which postcodes the free UK Mainland checkout covers
--
-- p_mixed_area_evidence settles the two Scottish districts that hold both
-- mainland and island addresses (IV40, PA34). The server works it out from the
-- address lookup ('island' or 'mainland'); customer-typed text is never used.
-- Without evidence those two come back 'ambiguous' and must not be promised
-- free mainland delivery.

create or replace function public.classify_postcode(
  p_postcode text,
  p_mixed_area_evidence text default null
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_pc text := public.normalise_postcode(p_postcode);
  v_outward text;
  v_area text;
  v_district integer;
  v_digits text;

  function_result jsonb;
begin
  if v_pc !~ '^([A-Z]{1,2}[0-9][A-Z0-9]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA) [0-9][A-Z]{2}$' then
    return jsonb_build_object('kind', 'invalid', 'postcode', v_pc, 'reason', 'invalid_format');
  end if;

  v_outward := split_part(v_pc, ' ', 1);
  v_area := substring(v_outward from '^[A-Z]+');
  v_digits := substring(substr(v_outward, length(v_area) + 1) from '^[0-9]{1,2}');
  v_district := case when v_digits is null then null else v_digits::integer end;

  function_result := case
    -- Northern Ireland is UK, but not UK Mainland.
    when v_area = 'BT' then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'northern_ireland')
    when v_area = 'IM' then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'isle_of_man')
    when v_area in ('JE', 'GY') then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'channel_islands')
    -- Forces, non-geographic and overseas formats never inherit mainland. GX11 is Gibraltar.
    when v_area in ('BF', 'BX', 'ZZ', 'ASCN', 'STHL', 'TDCU', 'BBND', 'BIQQ', 'FIQQ', 'SIQQ', 'PCRN', 'TKCA')
      or v_outward = 'GX11'
      then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'special_or_overseas')
    when v_area = 'PO' and v_district between 30 and 41
      then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'isle_of_wight')
    when v_area = 'TR' and v_district between 21 and 25
      then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'isles_of_scilly')
    -- Scottish islands. Mainland Highlands stay mainland.
    when v_area in ('HS', 'ZE')
      or (v_area = 'KA' and v_district between 27 and 28)
      or (v_area = 'KW' and v_district between 15 and 17)
      or (v_area = 'PH' and v_district between 42 and 44)
      or (v_area = 'PA' and (v_district = 20 or v_district between 41 and 49 or v_district between 60 and 78))
      or (v_area = 'IV' and (v_district between 41 and 49 or v_district = 51 or v_district between 55 and 56))
      then jsonb_build_object('zone', 'CUSTOM_QUOTE', 'reason', 'scottish_island')
    else null
  end;

  if function_result is not null then
    return jsonb_build_object('kind', 'classified', 'postcode', v_pc) || function_result;
  end if;

  -- IV40 (Raasay) and PA34 (Lismore, Kerrera, Easdale, Luing, Seil) are mixed.
  if v_outward in ('IV40', 'PA34') then
    if (v_outward = 'IV40' and v_pc in (
          'IV40 8NG', 'IV40 8NS', 'IV40 8NT', 'IV40 8NU', 'IV40 8NX', 'IV40 8NY', 'IV40 8NZ',
          'IV40 8PA', 'IV40 8PB', 'IV40 8PD', 'IV40 8PE', 'IV40 8PF', 'IV40 8PG'))
       or p_mixed_area_evidence = 'island' then
      return jsonb_build_object('kind', 'classified', 'postcode', v_pc,
                                'zone', 'CUSTOM_QUOTE', 'reason', 'mixed_geography_island');
    end if;
    if p_mixed_area_evidence = 'mainland' then
      return jsonb_build_object('kind', 'classified', 'postcode', v_pc,
                                'zone', 'MAINLAND_STANDARD', 'reason', 'mixed_geography_mainland');
    end if;
    return jsonb_build_object('kind', 'ambiguous', 'postcode', v_pc, 'reason', 'mixed_geography');
  end if;

  return jsonb_build_object('kind', 'classified', 'postcode', v_pc,
                            'zone', 'MAINLAND_STANDARD', 'reason', 'mainland');
end;
$$;

revoke all on function public.classify_postcode(text, text) from public;
grant execute on function public.classify_postcode(text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- What the delivery extras cost, from shop_settings

create or replace function public.quote_delivery(
  p_floor integer default 0,
  p_has_lift boolean default false,
  p_assembly boolean default false,
  p_removal boolean default false,
  p_removal_seats integer default null
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_floor integer;
  v_upstairs numeric(10,2);
  v_assembly numeric(10,2);
  v_seats integer;
  v_removal numeric(10,2);
begin
  select * into s from public.shop_settings where id;

  v_floor := greatest(0, least(coalesce(p_floor, 0), s.max_floor));
  v_upstairs := case
    when v_floor = 0 then 0
    when coalesce(p_has_lift, false) then s.upstairs_first_floor
    else s.upstairs_first_floor + (v_floor - 1) * s.upstairs_per_extra_floor
  end;
  v_assembly := case when coalesce(p_assembly, false) then s.assembly_fee else 0 end;
  -- A missing seat count falls back to the default; the count is held to the allowed range.
  v_seats := case
    when coalesce(p_removal, false)
      then greatest(s.removal_min_seats, least(coalesce(p_removal_seats, s.removal_default_seats), s.removal_max_seats))
    else null
  end;
  v_removal := coalesce(v_seats, 0) * s.removal_per_seat;

  return jsonb_build_object(
    'floor', v_floor,
    'has_lift', v_floor > 0 and coalesce(p_has_lift, false),
    'upstairs', v_upstairs,
    'assembly', v_assembly,
    'removal_seats', v_seats,
    'removal', v_removal,
    'total', v_upstairs + v_assembly + v_removal
  );
end;
$$;

revoke all on function public.quote_delivery(integer, boolean, boolean, boolean, integer) from public;
grant execute on function public.quote_delivery(integer, boolean, boolean, boolean, integer)
  to anon, authenticated, service_role;
