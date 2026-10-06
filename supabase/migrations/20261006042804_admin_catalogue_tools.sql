-- Admin catalogue tools (Phase 12): save a product with its categories,
-- colourways and offer tier in one step, and delete a product that has never
-- been ordered. Admin-checked, in the private schema behind public wrappers.
--
-- Colourways that disappear from the form are deleted when no order uses
-- them and hidden when one does, so order history always stays complete.

create function private.admin_save_product(p jsonb)
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
      insert into public.products (slug, title, product_type_id, base_price)
      values (v_slug, public.clean_text(p->>'title', 200), v_type, round((p->>'base_price')::numeric, 2))
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

-- A product that has never been ordered can go; an ordered one is hidden instead.
create function private.admin_delete_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
begin
  perform public.require_admin();
  if exists (select 1 from public.order_items where product_id = p_product_id) then
    raise exception 'HAS_ORDERS' using errcode = 'check_violation';
  end if;
  delete from public.products where id = p_product_id returning slug into v_slug;
  if v_slug is null then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  return jsonb_build_object('slug', v_slug);
end;
$$;

create function public.admin_save_product(p jsonb)
returns jsonb language sql set search_path = ''
as $$ select private.admin_save_product(p) $$;

create function public.admin_delete_product(p_product_id uuid)
returns jsonb language sql set search_path = ''
as $$ select private.admin_delete_product(p_product_id) $$;

revoke all on function private.admin_save_product(jsonb), private.admin_delete_product(uuid),
  public.admin_save_product(jsonb), public.admin_delete_product(uuid) from public, anon;
grant execute on function private.admin_save_product(jsonb), private.admin_delete_product(uuid),
  public.admin_save_product(jsonb), public.admin_delete_product(uuid) to authenticated, service_role;
