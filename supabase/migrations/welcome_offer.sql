-- Phase 21 (owner, 22 October 2026): a welcome offer for every visitor, a
-- minimum order, and was-prices for the pieces on a deal.
--
-- 1. Welcome offer. Every visitor gets £20 off each piece for 48 hours from
--    their first visit (shop_settings.welcome_offer_*). The window is a row in
--    welcome_offers, started once per visitor and never restarted or
--    extended, so the countdown the shop shows is true: when it ends, it ends.
--    Checkout sends the row's token (an httpOnly cookie) and
--    calculate_order_offer checks it. One offer per order: the welcome offer,
--    an offer code or an ad visitor's offer, whichever takes the most off.
-- 2. Minimum order. A website order's pieces (before offers and delivery) must
--    come to shop_settings.min_order_value (£400). price_order says whether a
--    basket is short; a trigger on orders refuses a website order that is
--    (BELOW_MINIMUM). Orders staff take by phone or WhatsApp are exempt.
-- 3. Was-prices. products.was_price, set in the admin on the pieces on a deal,
--    shows struck through beside the price with the percentage off. It must be
--    above the price. Every price change is kept in product_price_log, so a
--    was-price can be checked against what the piece really sold for (UK
--    pricing rules: a was-price must be a genuine, recent selling price).

-- Settings -------------------------------------------------------------------

alter table public.shop_settings
  add column welcome_offer_enabled boolean not null default true,
  add column welcome_offer_amount numeric(10,2) not null default 20 check (welcome_offer_amount between 0 and 1000),
  add column welcome_offer_hours smallint not null default 48 check (welcome_offer_hours between 1 and 720),
  add column min_order_value numeric(10,2) not null default 400 check (min_order_value between 0 and 100000);

comment on column public.shop_settings.welcome_offer_amount is 'Pounds off each piece during a visitor''s welcome offer.';
comment on column public.shop_settings.welcome_offer_hours is 'How long a welcome offer lasts from the first visit.';
comment on column public.shop_settings.min_order_value is 'The least a website order''s pieces can come to, before offers and delivery.';

-- The welcome offer ---------------------------------------------------------

create table public.welcome_offers (
  visitor_id uuid primary key,
  token uuid not null unique default gen_random_uuid(),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint welcome_offers_ends_after_start check (expires_at > started_at)
);

comment on table public.welcome_offers is
  'Each visitor''s welcome offer: started on the first visit, never restarted or extended. Kept a year after it ends.';

alter table public.welcome_offers enable row level security;
revoke all on public.welcome_offers from anon, authenticated;
grant select on public.welcome_offers to authenticated;
create policy "admins read welcome offers" on public.welcome_offers
  for select to authenticated using ((select private.is_admin()));

-- The visitor's welcome offer: this browser's own (from its cookie token) if
-- it has one, otherwise the device's, started now if it's the first visit.
-- An ended offer comes back ended (live false); null when the offer is off.
create function private.issue_welcome_offer(p_visitor_id uuid, p_token uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.shop_settings%rowtype;
  v_row public.welcome_offers%rowtype;
begin
  select * into s from public.shop_settings where id;
  if not s.welcome_offer_enabled or s.welcome_offer_amount <= 0 then
    return null;
  end if;

  if p_token is not null then
    select * into v_row from public.welcome_offers where token = p_token;
  end if;

  if v_row.visitor_id is null then
    if p_visitor_id is null then
      raise exception 'VISITOR_REQUIRED' using errcode = 'check_violation';
    end if;
    insert into public.welcome_offers (visitor_id, expires_at)
    values (p_visitor_id, now() + make_interval(hours => s.welcome_offer_hours))
    on conflict (visitor_id) do nothing;
    select * into v_row from public.welcome_offers where visitor_id = p_visitor_id;
  end if;

  return jsonb_build_object(
    'token', v_row.token,
    'started_at', v_row.started_at,
    'expires_at', v_row.expires_at,
    'live', v_row.expires_at > now(),
    'amount', s.welcome_offer_amount
  );
end;
$$;

revoke execute on function private.issue_welcome_offer(uuid, uuid) from public, anon, authenticated;
grant execute on function private.issue_welcome_offer(uuid, uuid) to service_role;

create function public.issue_welcome_offer(p_visitor_id uuid, p_token uuid default null)
returns jsonb language sql set search_path = ''
as $$ select private.issue_welcome_offer(p_visitor_id, p_token) $$;

revoke execute on function public.issue_welcome_offer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_welcome_offer(uuid, uuid) to service_role;

-- A year after it ends, a visitor's record goes (a visitor back after that is welcomed again).
select cron.schedule(
  'heartwell-welcome-cleanup', '25 3 * * *',
  $$delete from public.welcome_offers where expires_at < now() - interval '12 months'$$
);

-- One offer per order: the welcome offer, a code or an ad offer ----------------

alter table public.orders drop constraint orders_offer_source_check;
alter table public.orders add constraint orders_offer_source_check
  check (offer_source is null or offer_source in ('manual_code', 'paid_entitlement', 'welcome'));

drop function public.calculate_order_offer(jsonb, text, uuid);

create function public.calculate_order_offer(
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
  v_subtotal numeric(10,2);
  v_pieces integer;
  v_code text := nullif(upper(btrim(coalesce(p_promotion_code, ''))), '');
  v_code_valid boolean := false;
  v_entitlement_valid boolean := false;
  v_welcome_ends timestamptz;
  v_tier text;
  v_tier_amount numeric(10,2) := 0;
  v_welcome_amount numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_source text;
begin
  select coalesce(sum(l.unit_price * l.quantity), 0), coalesce(sum(l.quantity), 0)::integer
  into v_subtotal, v_pieces
  from public.order_lines(p_items) l;

  select * into s from public.shop_settings where id;

  if v_code is not null then
    select exists (select 1 from public.offer_codes oc where oc.code = v_code and oc.is_active)
    into v_code_valid;
  end if;

  if p_offer_entitlement_token is not null then
    select exists (
      select 1 from public.offer_entitlements oe
      where oe.token = p_offer_entitlement_token and oe.revoked_at is null and oe.expires_at > now()
    ) into v_entitlement_valid;
  end if;

  if p_welcome_token is not null and s.welcome_offer_enabled then
    select wo.expires_at into v_welcome_ends
    from public.welcome_offers wo
    where wo.token = p_welcome_token and wo.expires_at > now();
  end if;

  if v_code_valid or v_entitlement_valid then
    -- The order's best tier decides a code's or an ad offer's amount.
    select opt.tier into v_tier
    from public.order_lines(p_items) l
    join public.offer_product_tiers opt on opt.product_id = l.product_id
    order by case opt.tier when 'HIGH' then 4 when 'MID' then 3 when 'STANDARD' then 2 else 1 end desc
    limit 1;

    v_tier_amount := least(v_subtotal, case v_tier
      when 'HIGH' then s.offer_tier_high
      when 'MID' then s.offer_tier_mid
      when 'STANDARD' then s.offer_tier_standard
      else 0
    end);
  end if;

  -- The welcome offer: a fixed amount off every piece.
  if v_welcome_ends is not null then
    v_welcome_amount := least(v_subtotal, s.welcome_offer_amount * v_pieces);
  end if;

  -- Whichever takes the most off; a tie keeps the code or ad offer. A code
  -- that is valid but takes nothing off is still recorded, as before.
  if (v_code_valid or v_entitlement_valid) and v_tier_amount >= v_welcome_amount then
    v_discount := v_tier_amount;
    v_source := case when v_code_valid then 'manual_code' else 'paid_entitlement' end;
  elsif v_welcome_amount > 0 then
    v_discount := v_welcome_amount;
    v_source := 'welcome';
  end if;

  return jsonb_build_object(
    'items_subtotal', v_subtotal,
    'pieces', v_pieces,
    'code_valid', v_code_valid,
    'entitlement_valid', v_entitlement_valid,
    'welcome_valid', v_welcome_ends is not null,
    'welcome_ends_at', v_welcome_ends,
    'welcome_amount', v_welcome_amount,
    'code_amount', v_tier_amount,
    'promotion_code', case when v_source = 'manual_code' then v_code end,
    'discount_tier', case when v_source in ('manual_code', 'paid_entitlement') then v_tier end,
    'discount_amount', v_discount,
    'offer_source', v_source
  );
end;
$$;

revoke execute on function public.calculate_order_offer(jsonb, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.calculate_order_offer(jsonb, text, uuid, uuid) to service_role;

-- price_order: the welcome token, and whether the basket meets the minimum.
create or replace function public.price_order(p_input jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_offer jsonb;
  v_delivery jsonb;
  v_extras jsonb := coalesce(p_input->'extras', '{}'::jsonb);
  v_area jsonb;
  v_area_fee numeric(10,2);
  v_subtotal numeric(10,2);
  v_discount numeric(10,2);
  v_minimum numeric(10,2);
  v_has_mto boolean;
begin
  v_offer := public.calculate_order_offer(
    p_input->'items',
    p_input->>'promotion_code',
    public.try_uuid(p_input->>'offer_entitlement_token'),
    public.try_uuid(p_input->>'welcome_token')
  );

  v_delivery := public.quote_delivery(
    case when v_extras->>'floor' ~ '^[0-9]{1,2}$' then (v_extras->>'floor')::integer else 0 end,
    coalesce((v_extras->>'has_lift') = 'true', false),
    coalesce((v_extras->>'assembly') = 'true', false),
    coalesce((v_extras->>'removal') = 'true', false),
    case when v_extras->>'removal_seats' ~ '^[0-9]{1,2}$' then (v_extras->>'removal_seats')::integer end
  );

  -- The area's charge, once the postcode is known.
  v_area := case when nullif(btrim(coalesce(p_input->>'postcode', '')), '') is not null
                 then public.delivery_area(p_input->>'postcode') end;
  v_area_fee := coalesce((v_area->>'charge')::numeric, 0);
  v_delivery := v_delivery || jsonb_build_object(
    'area', v_area,
    'area_fee', v_area_fee,
    'total', (v_delivery->>'total')::numeric + v_area_fee
  );

  select coalesce(bool_or(l.made_to_order), false) into v_has_mto
  from public.order_lines(p_input->'items') l;

  select min_order_value into v_minimum from public.shop_settings where id;

  v_subtotal := (v_offer->>'items_subtotal')::numeric;
  v_discount := (v_offer->>'discount_amount')::numeric;

  return v_offer || jsonb_build_object(
    'delivery', v_delivery,
    'delivery_total', (v_delivery->>'total')::numeric,
    'has_made_to_order', v_has_mto,
    'minimum_order', coalesce(v_minimum, 0),
    'below_minimum', v_subtotal < coalesce(v_minimum, 0),
    'total_amount', greatest(0, v_subtotal - v_discount) + (v_delivery->>'total')::numeric
  );
end;
$$;

-- The minimum, for every website order however it's placed.
create function private.check_order_minimum()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minimum numeric(10,2);
begin
  if new.source = 'website' then
    select min_order_value into v_minimum from public.shop_settings where id;
    if new.items_subtotal < coalesce(v_minimum, 0) then
      raise exception 'BELOW_MINIMUM: %', v_minimum using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.check_order_minimum() from public, anon, authenticated;

create trigger orders_minimum
  before insert on public.orders
  for each row execute function private.check_order_minimum();

-- Was-prices -------------------------------------------------------------------

alter table public.products
  add column was_price numeric(10,2) constraint products_was_price_check check (was_price is null or was_price > 0);

comment on column public.products.was_price is
  'The price before a deal, shown struck through. Only a price the piece really sold at, here, recently.';

grant select (was_price) on public.products to anon;

create table public.product_price_log (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  price numeric(10,2) not null,
  was_price numeric(10,2),
  changed_at timestamptz not null default now()
);

create index product_price_log_product on public.product_price_log (product_id, changed_at desc);

comment on table public.product_price_log is 'Every price a product has had, and when, to check was-prices against.';

alter table public.product_price_log enable row level security;
revoke all on public.product_price_log from anon, authenticated;
grant select on public.product_price_log to authenticated;
create policy "admins read the price log" on public.product_price_log
  for select to authenticated using ((select private.is_admin()));

create function private.log_product_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.base_price is distinct from old.base_price or new.was_price is distinct from old.was_price then
    insert into public.product_price_log (product_id, price, was_price) values (new.id, new.base_price, new.was_price);
  end if;
  return null;
end;
$$;

revoke execute on function private.log_product_price() from public, anon, authenticated;

create trigger products_log_price
  after insert or update of base_price, was_price on public.products
  for each row execute function private.log_product_price();

-- Today's prices, on record from the day the shop opened (16 October 2026), or
-- from when a piece was added after that.
insert into public.product_price_log (product_id, price, was_price, changed_at)
select id, base_price, null, greatest(created_at, timestamptz '2026-10-16 00:00:00 Europe/London')
from public.products;

-- The product editor saves the was-price with everything else.
create or replace function private.admin_save_product(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.try_uuid(p->>'id');
  v_type uuid;
  v_range uuid;
  v_category uuid;
  v_constraint text;
  v_kept uuid[] := '{}';
  v_variant jsonb;
  v_variant_id uuid;
  v_hidden integer := 0;
  v_deleted integer := 0;
  v_slug text := lower(btrim(coalesce(p->>'slug', '')));
  v_was text := nullif(btrim(coalesce(p->>'was_price', '')), '');
begin
  perform public.require_admin();

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'BAD_SLUG' using errcode = 'check_violation';
  end if;
  if public.clean_text(p->>'title', 200) is null then
    raise exception 'MISSING_TITLE' using errcode = 'check_violation';
  end if;
  if coalesce(p->>'base_price', '') !~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then
    raise exception 'BAD_PRICE' using errcode = 'check_violation';
  end if;
  if v_was is not null and v_was !~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then
    raise exception 'BAD_WAS_PRICE' using errcode = 'check_violation';
  end if;
  if v_was is not null and round(v_was::numeric, 2) <= round((p->>'base_price')::numeric, 2) then
    raise exception 'WAS_PRICE_NOT_HIGHER' using errcode = 'check_violation';
  end if;
  select id into v_type from public.product_types where slug = p->>'product_type';
  if v_type is null then
    raise exception 'UNKNOWN_TYPE' using errcode = 'foreign_key_violation';
  end if;
  if nullif(p->>'range', '') is not null then
    select id into v_range from public.ranges where slug = p->>'range';
    if v_range is null then raise exception 'UNKNOWN_RANGE' using errcode = 'foreign_key_violation'; end if;
  end if;
  if nullif(p->>'primary_category', '') is not null then
    select id into v_category from public.categories where slug = p->>'primary_category';
    if v_category is null then raise exception 'UNKNOWN_CATEGORY' using errcode = 'foreign_key_violation'; end if;
  end if;
  if jsonb_typeof(coalesce(p->'variants', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p->'variants', '[]'::jsonb)) = 0 then
    raise exception 'NO_COLOURWAYS' using errcode = 'check_violation';
  end if;

  begin
    if v_id is null then
      insert into public.products (slug, title, product_type_id, base_price, was_price)
      values (v_slug, public.clean_text(p->>'title', 200), v_type, round((p->>'base_price')::numeric, 2), round(v_was::numeric, 2))
      returning id into v_id;
    elsif not exists (select 1 from public.products where id = v_id) then
      raise exception 'NOT_FOUND' using errcode = 'no_data_found';
    end if;

    update public.products set
      slug = v_slug,
      title = public.clean_text(p->>'title', 200),
      trade_title = public.clean_text(p->>'trade_title', 200),
      product_type_id = v_type,
      range_id = v_range,
      primary_category_id = v_category,
      axis1_value = public.clean_text(p->>'axis1_value', 80),
      axis2_value = public.clean_text(p->>'axis2_value', 80),
      base_price = round((p->>'base_price')::numeric, 2),
      was_price = round(v_was::numeric, 2),
      origin = coalesce(nullif(p->>'origin', ''), 'unspecified'),
      made_to_order = coalesce((p->>'made_to_order')::boolean, false),
      is_featured = coalesce((p->>'is_featured')::boolean, false),
      is_active = coalesce((p->>'is_active')::boolean, true),
      width_cm = nullif(p->>'width_cm', '')::numeric,
      depth_cm = nullif(p->>'depth_cm', '')::numeric,
      height_cm = nullif(p->>'height_cm', '')::numeric,
      seat_height_cm = nullif(p->>'seat_height_cm', '')::numeric,
      seat_depth_cm = nullif(p->>'seat_depth_cm', '')::numeric,
      side_a_cm = nullif(p->>'side_a_cm', '')::numeric,
      side_b_cm = nullif(p->>'side_b_cm', '')::numeric,
      dimensions_note = public.clean_text(p->>'dimensions_note', 300),
      specifications = coalesce(p->'specifications', '{}'::jsonb),
      description = nullif(btrim(coalesce(p->>'description', '')), ''),
      highlights = coalesce(array(select public.clean_text(h, 200) from jsonb_array_elements_text(coalesce(p->'highlights', '[]'::jsonb)) h where public.clean_text(h, 200) is not null), '{}'),
      seo_title = public.clean_text(p->>'seo_title', 120),
      seo_description = public.clean_text(p->>'seo_description', 320),
      gallery_images = coalesce(array(select g from jsonb_array_elements_text(coalesce(p->'gallery_images', '[]'::jsonb)) g where g ~ '^https://res\.cloudinary\.com/'), '{}'),
      sort = coalesce(nullif(p->>'sort', '')::integer, 99)
    where id = v_id;

    -- Categories: exactly the ones sent, the primary one included.
    delete from public.product_categories where product_id = v_id;
    insert into public.product_categories (product_id, category_id)
    select distinct v_id, c.id
    from public.categories c
    where c.slug in (select jsonb_array_elements_text(coalesce(p->'categories', '[]'::jsonb)))
       or c.id = v_category;

    -- Offer tier: none means no offer row (the offer then gives nothing).
    if nullif(p->>'offer_tier', '') is null then
      delete from public.offer_product_tiers where product_id = v_id;
    else
      insert into public.offer_product_tiers (product_id, tier) values (v_id, p->>'offer_tier')
      on conflict (product_id) do update set tier = excluded.tier;
    end if;

    -- Colourways
    for v_variant in select * from jsonb_array_elements(p->'variants') loop
      v_variant_id := public.try_uuid(v_variant->>'id');
      if v_variant_id is not null and exists (select 1 from public.product_variants where id = v_variant_id and product_id = v_id) then
        update public.product_variants set
          sku = btrim(v_variant->>'sku'),
          colour_name = public.clean_text(v_variant->>'colour_name', 80),
          colour_hex = nullif(upper(btrim(coalesce(v_variant->>'colour_hex', ''))), ''),
          material_label = public.clean_text(v_variant->>'material_label', 80),
          price_adjustment = round(coalesce(nullif(v_variant->>'price_adjustment', '')::numeric, 0), 2),
          image_url = case when v_variant->>'image_url' ~ '^https://res\.cloudinary\.com/' then v_variant->>'image_url' end,
          sort = coalesce(nullif(v_variant->>'sort', '')::integer, 99),
          is_active = coalesce((v_variant->>'is_active')::boolean, true)
        where id = v_variant_id;
      else
        insert into public.product_variants (product_id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort, is_active)
        values (
          v_id, btrim(v_variant->>'sku'), public.clean_text(v_variant->>'colour_name', 80),
          nullif(upper(btrim(coalesce(v_variant->>'colour_hex', ''))), ''), public.clean_text(v_variant->>'material_label', 80),
          round(coalesce(nullif(v_variant->>'price_adjustment', '')::numeric, 0), 2),
          case when v_variant->>'image_url' ~ '^https://res\.cloudinary\.com/' then v_variant->>'image_url' end,
          coalesce(nullif(v_variant->>'sort', '')::integer, 99), coalesce((v_variant->>'is_active')::boolean, true)
        )
        returning id into v_variant_id;
      end if;
      v_kept := v_kept || v_variant_id;
    end loop;

    -- Colourways no longer on the form: hidden if ordered, otherwise deleted.
    update public.product_variants pv set is_active = false
    where pv.product_id = v_id and not (pv.id = any (v_kept)) and pv.is_active
      and exists (select 1 from public.order_items oi where oi.variant_id = pv.id);
    get diagnostics v_hidden = row_count;
    delete from public.product_variants pv
    where pv.product_id = v_id and not (pv.id = any (v_kept))
      and not exists (select 1 from public.order_items oi where oi.variant_id = pv.id);
    get diagnostics v_deleted = row_count;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      raise exception '%', case
        when v_constraint like 'products_slug%' then 'SLUG_TAKEN'
        when v_constraint like 'product_variants_sku%' then 'SKU_TAKEN'
        when v_constraint like 'products_range_axes%' then 'RANGE_SIZE_TAKEN'
        else 'DUPLICATE: ' || v_constraint end
        using errcode = 'unique_violation';
    when check_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = '' then raise; end if;
      raise exception 'INVALID_VALUE: %', v_constraint using errcode = 'check_violation';
  end;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'colourways_hidden', v_hidden, 'colourways_deleted', v_deleted);
end;
$$;
