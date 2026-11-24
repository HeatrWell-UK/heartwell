-- Owner, 24 November 2026 (Run 3, final pricing scope): the Christmas and New
-- Year sofa event becomes ONE personal 14-day offer per visitor:
--
--   * £50 off EACH eligible piece of seating, per unit: every active product
--     except the ones the shop excludes from offers (tier EXCLUDED: the Sims
--     Footstool). Made-to-order AND imported (recliners, armchairs).
--     At today's list prices; no price is raised and no was-price is created.
--   * Every visitor, new or returning (including people whose earlier welcome
--     or ad offer ended, and past customers), gets ONE fresh window at their
--     first visit after the season starts: 336 hours (shop_settings
--     .offer_window_hours), capped at the season's end (1 February 2027 00:00
--     London), so nobody is promised days that don't exist. Never reset by a
--     reload, a new tab, a code or an ad click; never issued to people who
--     don't visit. A revoked entitlement stays revoked.
--   * One generation marker (shop_settings.offer_generation): a visitor whose
--     entitlement carries another generation gets a fresh one once; the old
--     state is archived (no tokens) in private.offer_entitlement_history.
--   * During the season the 48-hour welcome offer and the 7-day ad offer are
--     not used: an ad click claims the seasonal window instead. CHRISTMAS,
--     NEWYEAR and HEARTSOFA are recognised and recorded but add nothing: the
--     discount comes from the visitor's window, not from a code. When the
--     window has ended, the price is the list price (honest ended state).
--   * After the season the old rules (welcome, ad tiers, HEARTSOFA) resume by
--     themselves; nothing here deletes them.
--
-- Past orders keep the amounts they were placed with.

-- 1. Settings ------------------------------------------------------------------------

alter table public.shop_settings
  add column offer_window_hours smallint not null default 336
    check (offer_window_hours between 1 and 2160),
  add column offer_generation text not null default 'season_2026_27_v1'
    check (offer_generation ~ '^[a-z0-9_]{3,40}$');

comment on column public.shop_settings.event_mto_amount is
  'Pounds off each eligible piece of seating during the season (since Run 3: all active seating except tier EXCLUDED, made to order and imported).';
comment on column public.shop_settings.offer_window_hours is 'Length of each visitor''s seasonal offer window (capped at event_ends_at).';
comment on column public.shop_settings.offer_generation is 'Changing it gives every visitor ONE fresh window at their next visit (old state archived).';

-- 2. Entitlements carry the season's generation ----------------------------------------

alter table public.offer_entitlements drop constraint offer_entitlements_source_check;
alter table public.offer_entitlements add constraint offer_entitlements_source_check
  check (source in ('google_ads', 'meta_ads', 'meta_catalog', 'seasonal'));
alter table public.offer_entitlements add column generation text;
create index offer_entitlements_generation_idx on public.offer_entitlements (generation) where generation is not null;

-- 3. History of replaced windows (no tokens) -----------------------------------------------

create table private.offer_entitlement_history (
  id bigint generated always as identity primary key,
  entitlement_id uuid not null,
  visitor_id uuid not null,
  source text not null,
  generation text,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  archived_at timestamptz not null default now(),
  replaced_by_generation text not null
);
create index offer_entitlement_history_visitor_idx on private.offer_entitlement_history (visitor_id);
comment on table private.offer_entitlement_history is 'Offer windows replaced by a new season generation. Never holds tokens.';
revoke all on private.offer_entitlement_history from public, anon, authenticated;

-- 4. One fresh window per visitor per generation ---------------------------------------------

create or replace function private.issue_seasonal_offer(p_visitor_id uuid, p_token uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_now timestamptz := now();
  v_row public.offer_entitlements%rowtype;
  v_found boolean := false;
  v_expires timestamptz;
begin
  if p_visitor_id is null then
    raise exception 'VISITOR_REQUIRED' using errcode = 'check_violation';
  end if;
  select * into s from public.shop_settings where id;
  if not (s.event_enabled and v_now >= s.event_starts_at and v_now < s.event_ends_at and s.event_mto_amount > 0) then
    return null;
  end if;

  -- The browser's own token wins over its device ID (a new ID or cleared
  -- storage never earns a second window); then the device ID. Locked, so two
  -- tabs opening at once can't both grant.
  if p_token is not null then
    select * into v_row from public.offer_entitlements where token = p_token for update;
    v_found := found;
  end if;
  if not v_found then
    select * into v_row from public.offer_entitlements where visitor_id = p_visitor_id for update;
    v_found := found;
  end if;

  if v_found and (v_row.revoked_at is not null or v_row.generation = s.offer_generation) then
    -- Revoked stays revoked; this generation's window is never reset.
    return jsonb_build_object('token', v_row.token, 'started_at', v_row.started_at, 'expires_at', v_row.expires_at,
                              'live', v_row.revoked_at is null and v_row.expires_at > v_now, 'generation', v_row.generation, 'fresh', false);
  end if;

  v_expires := least(v_now + make_interval(hours => s.offer_window_hours), s.event_ends_at);

  if v_found then
    insert into private.offer_entitlement_history (entitlement_id, visitor_id, source, generation, started_at, expires_at, revoked_at, replaced_by_generation)
    values (v_row.id, v_row.visitor_id, v_row.source, v_row.generation, v_row.started_at, v_row.expires_at, v_row.revoked_at, s.offer_generation);
    update public.offer_entitlements
    set token = gen_random_uuid(), source = 'seasonal', generation = s.offer_generation, qualifying_arrival_id = null,
        started_at = v_now, expires_at = v_expires, revoked_at = null, updated_at = v_now
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.offer_entitlements as e (token, visitor_id, source, generation, started_at, expires_at, updated_at)
    values (gen_random_uuid(), p_visitor_id, 'seasonal', s.offer_generation, v_now, v_expires, v_now)
    on conflict (visitor_id) do update set updated_at = e.updated_at  -- a racing tab inserted first: keep its row
    returning * into v_row;
  end if;

  return jsonb_build_object('token', v_row.token, 'started_at', v_row.started_at, 'expires_at', v_row.expires_at,
                            'live', v_row.expires_at > v_now, 'generation', v_row.generation, 'fresh', true);
end;
$$;

create or replace function public.issue_seasonal_offer(p_visitor_id uuid, p_token uuid default null)
returns jsonb
language sql
set search_path = ''
as $$ select private.issue_seasonal_offer(p_visitor_id, p_token) $$;

revoke execute on function private.issue_seasonal_offer(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.issue_seasonal_offer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_seasonal_offer(uuid, uuid) to service_role;

-- 5. Ad clicks during the season claim the seasonal window --------------------------------------

create or replace function public.issue_paid_offer_entitlement(p_visitor_id uuid, p_source text, p_arrival_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_days integer;
  v_row public.offer_entitlements%rowtype;
  v_season jsonb;
begin
  if p_visitor_id is null then
    raise exception 'VISITOR_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_source is null or p_source not in ('google_ads', 'meta_ads', 'meta_catalog') then
    raise exception 'INVALID_OFFER_SOURCE' using errcode = 'check_violation';
  end if;

  -- Run 3: during the season an ad visitor gets the same single seasonal window as everyone else.
  v_season := private.issue_seasonal_offer(p_visitor_id, null);
  if v_season is not null then
    return v_season;
  end if;

  select paid_offer_days into v_days from public.shop_settings where id;

  insert into public.offer_entitlements as e (
    token, visitor_id, source, qualifying_arrival_id, started_at, expires_at, revoked_at, updated_at
  )
  values (
    gen_random_uuid(), p_visitor_id, p_source, p_arrival_id,
    v_now, v_now + make_interval(days => v_days), null, v_now
  )
  on conflict (visitor_id) do update
  set token = case when e.revoked_at is null and e.expires_at > v_now then e.token else gen_random_uuid() end,
      source = case
        when e.revoked_at is not null or e.expires_at <= v_now then excluded.source
        when e.source = 'meta_ads' or excluded.source = 'meta_ads' then 'meta_ads'
        when e.source = 'google_ads' or excluded.source = 'google_ads' then 'google_ads'
        else 'meta_catalog'
      end,
      qualifying_arrival_id = case
        when e.revoked_at is not null or e.expires_at <= v_now then excluded.qualifying_arrival_id
        when e.source = 'meta_ads' or (e.source = 'google_ads' and excluded.source = 'meta_catalog')
          then e.qualifying_arrival_id
        when excluded.source = 'meta_ads' or (excluded.source = 'google_ads' and e.source = 'meta_catalog')
          then excluded.qualifying_arrival_id
        else coalesce(e.qualifying_arrival_id, excluded.qualifying_arrival_id)
      end,
      started_at = case when e.revoked_at is null and e.expires_at > v_now then e.started_at else v_now end,
      expires_at = v_now + make_interval(days => v_days),
      revoked_at = null,
      generation = null,
      updated_at = v_now
  returning * into v_row;

  return jsonb_build_object(
    'token', v_row.token,
    'source', v_row.source,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at
  );
end;
$$;

-- 6. The offer ------------------------------------------------------------------------------------

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
  v_code_valid boolean := false;
  v_alias_valid boolean := false;
  v_entitlement_valid boolean := false;
  v_welcome_ends timestamptz;
  v_event_live boolean;
  v_phase text;
  v_ent public.offer_entitlements%rowtype;
  v_season_valid boolean := false;
  v_season_ended boolean := false;
  v_tier text;
  v_tier_amount numeric(10,2) := 0;
  v_welcome_amount numeric(10,2) := 0;
  v_event_amount numeric(10,2) := 0;
  v_event_units integer := 0;
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

  if v_event_live then
    -- The season: the visitor's own window decides; codes add nothing.
    if p_offer_entitlement_token is not null then
      select * into v_ent from public.offer_entitlements where token = p_offer_entitlement_token;
      if found and v_ent.generation = s.offer_generation then
        v_season_valid := v_ent.revoked_at is null and v_ent.expires_at > v_now;
        v_season_ended := not v_season_valid;
      end if;
    end if;
    if v_season_valid then
      select
        coalesce(sum(least(l.unit_price * l.quantity, s.event_mto_amount * l.quantity)) filter (where e.eligible), 0),
        coalesce(sum(l.quantity) filter (where e.eligible), 0)::integer
      into v_event_amount, v_event_units
      from public.order_lines(p_items) l
      left join public.offer_product_tiers opt on opt.product_id = l.product_id
      cross join lateral (select coalesce(opt.tier, '') <> 'EXCLUDED' as eligible) e;
      if v_event_amount > 0 then
        v_discount := v_event_amount;
        v_source := 'event';
        v_result_code := case when v_alias_valid or v_code_valid then v_code end;
      end if;
    end if;
    v_entitlement_valid := v_season_valid;
  else
    -- Outside the season: the shop as before (welcome per piece, or the order's best tier for a code or an ad visit).
    if p_offer_entitlement_token is not null then
      select exists (
        select 1 from public.offer_entitlements oe
        where oe.token = p_offer_entitlement_token and oe.revoked_at is null and oe.expires_at > v_now
          and oe.source <> 'seasonal'
      ) into v_entitlement_valid;
    end if;
    if p_welcome_token is not null and s.welcome_offer_enabled then
      select wo.expires_at into v_welcome_ends
      from public.welcome_offers wo
      where wo.token = p_welcome_token and wo.expires_at > v_now;
    end if;
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
      v_discount := v_tier_amount;
      v_source := case when v_code_valid then 'manual_code' else 'paid_entitlement' end;
      v_result_tier := v_tier;
      v_result_code := case when v_code_valid then v_code end;
    elsif v_welcome_amount > 0 then
      v_discount := v_welcome_amount;
      v_source := 'welcome';
    end if;
  end if;

  return jsonb_build_object(
    'items_subtotal', v_subtotal,
    'pieces', v_pieces,
    'code_valid', v_code_valid or v_alias_valid,
    'code_is_event_alias', v_alias_valid or (v_event_live and v_code_valid),
    'entitlement_valid', v_entitlement_valid,
    'season_ended', v_season_ended,
    'season_ends_at', case when v_season_valid or v_season_ended then v_ent.expires_at end,
    'welcome_valid', v_welcome_ends is not null,
    'welcome_ends_at', v_welcome_ends,
    'welcome_amount', v_welcome_amount,
    'code_amount', v_tier_amount,
    'event_live', v_event_live,
    'event_phase', v_phase,
    'event_name', case when v_event_live then s.event_name end,
    'event_ends_at', case when v_event_live then s.event_ends_at end,
    'event_amount', v_event_amount,
    'event_units', v_event_units,
    'rest_amount', 0,
    'rest_source', null,
    'promotion_code', v_result_code,
    'discount_tier', v_result_tier,
    'discount_amount', v_discount,
    'offer_source', v_source
  );
end;
$$;

-- 7. Admin: the season's settings, in plain words ------------------------------------------------

create or replace function private.admin_season_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shop_settings where id;
  return jsonb_build_object(
    'enabled', s.event_enabled, 'starts_at', s.event_starts_at, 'ends_at', s.event_ends_at,
    'amount', s.event_mto_amount, 'window_hours', s.offer_window_hours, 'generation', s.offer_generation,
    'live_now', s.event_enabled and now() >= s.event_starts_at and now() < s.event_ends_at,
    'windows_this_generation', (select count(*) from public.offer_entitlements where generation = s.offer_generation),
    'windows_live', (select count(*) from public.offer_entitlements where generation = s.offer_generation and revoked_at is null and expires_at > now()),
    'windows_ended', (select count(*) from public.offer_entitlements where generation = s.offer_generation and (revoked_at is not null or expires_at <= now())),
    'archived', (select count(*) from private.offer_entitlement_history),
    'eligible_products', (select count(*) from public.products p left join public.offer_product_tiers t on t.product_id = p.id where p.is_active and coalesce(t.tier, '') <> 'EXCLUDED'),
    'excluded_products', (select coalesce(jsonb_agg(p.title order by p.title), '[]') from public.products p join public.offer_product_tiers t on t.product_id = p.id where p.is_active and t.tier = 'EXCLUDED')
  );
end;
$$;

create or replace function public.admin_season_status()
returns jsonb language sql set search_path = '' as $$ select private.admin_season_status() $$;

create or replace function private.admin_save_season(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts timestamptz := (p_input->>'starts_at')::timestamptz;
  v_ends timestamptz := (p_input->>'ends_at')::timestamptz;
  v_hours integer := (p_input->>'window_hours')::integer;
  v_new_gen boolean := coalesce((p_input->>'new_generation')::boolean, false);
begin
  perform public.require_admin();
  if v_starts is null or v_ends is null or v_ends <= v_starts then
    raise exception 'SEASON_DATES' using errcode = 'check_violation';
  end if;
  if v_hours is null or v_hours < 1 or v_hours > 2160 then
    raise exception 'SEASON_HOURS' using errcode = 'check_violation';
  end if;
  update public.shop_settings
  set event_enabled = coalesce((p_input->>'enabled')::boolean, event_enabled),
      event_starts_at = v_starts,
      event_ends_at = v_ends,
      offer_window_hours = v_hours,
      offer_generation = case when v_new_gen then 'season_' || to_char(now() at time zone 'Europe/London', 'YYYYMMDD_HH24MI') else offer_generation end,
      updated_at = now()
  where id;
  return private.admin_season_status();
end;
$$;

create or replace function public.admin_save_season(p_input jsonb)
returns jsonb language sql set search_path = '' as $$ select private.admin_save_season(p_input) $$;

revoke execute on function private.admin_season_status() from public, anon;
revoke execute on function public.admin_season_status() from public, anon;
revoke execute on function private.admin_save_season(jsonb) from public, anon;
revoke execute on function public.admin_save_season(jsonb) from public, anon;
grant execute on function private.admin_season_status() to authenticated;
grant execute on function public.admin_season_status() to authenticated;
grant execute on function private.admin_save_season(jsonb) to authenticated;
grant execute on function public.admin_save_season(jsonb) to authenticated;

-- 8. Codes: CHRISTMAS is valid from the season's start (it may start before 1 December) ---------

update public.offer_codes set valid_from = null where code = 'CHRISTMAS';
