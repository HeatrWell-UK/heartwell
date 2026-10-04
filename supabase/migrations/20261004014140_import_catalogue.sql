-- Catalogue import (Phase 5).
--
-- public.import_catalogue(payload) writes Heartwell's catalogue from the
-- payload built by scripts/catalogue/build-import.mjs. Rows are matched on
-- slugs, SKUs and (collection, code), so running it again adds what is new
-- and updates what changed in place: IDs, web addresses and order history
-- never change, and nothing is duplicated.
--
-- Any section of the payload may be left out, so a large import can be sent
-- in parts: product types, categories, ranges and materials before products,
-- products before variants.
--
-- With p_update (the default) existing rows are refreshed, except what the
-- owner controls: whether a product, variant or material is shown or
-- featured, descriptions and SEO text (never imported), and any photo that
-- has already been replaced (only photos still in heartwell/source/ are
-- refreshed). With p_update = false existing rows are left exactly as they are.
--
-- Returns, per table, how many rows were inserted and how many changed.
-- Unchanged rows are not touched, so a second identical run reports zeros.
-- Service role only.

-- A photo is refreshed only while it is still an imported original.
create or replace function private.import_photo(p_current text, p_incoming text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_current is null or p_current like '%/heartwell/source/%' then coalesce(p_incoming, p_current)
    else p_current
  end
$$;

create or replace function private.import_gallery(p_current text[], p_incoming text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when not exists (select 1 from unnest(p_current) g where g not like '%/heartwell/source/%') then coalesce(p_incoming, p_current)
    else p_current
  end
$$;

create or replace function public.import_catalogue(p jsonb, p_update boolean default true)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  n_ins integer;
  n_upd integer;
  problems text;
  new_slugs text[];
begin
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'IMPORT_PAYLOAD: expected a JSON object' using errcode = 'invalid_parameter_value';
  end if;

  -- Product types --------------------------------------------------------
  with src as (
    select * from jsonb_to_recordset(coalesce(p->'product_types', '[]'::jsonb)) as x(
      slug text, name text, name_plural text, spec_fields jsonb, filters jsonb, material_kinds text[],
      removal_unit text, google_product_category text, meta_product_category text, sort integer)
  ), up as (
    insert into public.product_types as t
      (slug, name, name_plural, spec_fields, filters, material_kinds, removal_unit,
       google_product_category, meta_product_category, sort)
    select slug, name, name_plural, coalesce(spec_fields, '[]'), coalesce(filters, '[]'), coalesce(material_kinds, '{}'),
           coalesce(removal_unit, 'seat'), google_product_category, meta_product_category, coalesce(sort, 99)
    from src
    on conflict (slug) do update set
      name = excluded.name, name_plural = excluded.name_plural, spec_fields = excluded.spec_fields,
      filters = excluded.filters, material_kinds = excluded.material_kinds, removal_unit = excluded.removal_unit,
      google_product_category = excluded.google_product_category,
      meta_product_category = excluded.meta_product_category, sort = excluded.sort
    where p_update and (t.name, t.name_plural, t.spec_fields, t.filters, t.material_kinds, t.removal_unit,
                        t.google_product_category, t.meta_product_category, t.sort)
      is distinct from (excluded.name, excluded.name_plural, excluded.spec_fields, excluded.filters,
                        excluded.material_kinds, excluded.removal_unit, excluded.google_product_category,
                        excluded.meta_product_category, excluded.sort)
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;
  result := result || jsonb_build_object('product_types', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  -- Categories: rows first, then parents (so order in the payload doesn't matter)
  with src as (
    select * from jsonb_to_recordset(coalesce(p->'categories', '[]'::jsonb)) as x(
      slug text, name text, parent_slug text, image_url text, sort integer)
  ), up as (
    insert into public.categories as t (slug, name, image_url, sort)
    select slug, name, image_url, coalesce(sort, 99) from src
    on conflict (slug) do update set
      name = excluded.name, sort = excluded.sort,
      image_url = private.import_photo(t.image_url, excluded.image_url)
    where p_update and (t.name, t.sort, t.image_url)
      is distinct from (excluded.name, excluded.sort, private.import_photo(t.image_url, excluded.image_url))
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;

  select string_agg(x.parent_slug, ', ') into problems
  from jsonb_to_recordset(coalesce(p->'categories', '[]'::jsonb)) as x(slug text, parent_slug text)
  where x.parent_slug is not null and not exists (select 1 from public.categories c where c.slug = x.parent_slug);
  if problems is not null then
    raise exception 'IMPORT_REFERENCE: unknown parent categories: %', problems using errcode = 'foreign_key_violation';
  end if;

  with src as (
    select x.slug, parent.id as parent_id
    from jsonb_to_recordset(coalesce(p->'categories', '[]'::jsonb)) as x(slug text, parent_slug text)
    left join public.categories parent on parent.slug = x.parent_slug
  ), moved as (
    update public.categories c set parent_id = src.parent_id
    from src
    where c.slug = src.slug and c.parent_id is distinct from src.parent_id
      and (p_update or c.parent_id is null)
    returning 1
  )
  select n_upd + count(*) into n_upd from moved;
  result := result || jsonb_build_object('categories', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  -- Ranges ---------------------------------------------------------------
  with src as (
    select * from jsonb_to_recordset(coalesce(p->'ranges', '[]'::jsonb)) as x(
      slug text, name text, axis1_name text, axis2_name text, sort integer)
  ), up as (
    insert into public.ranges as t (slug, name, axis1_name, axis2_name, sort)
    select slug, name, coalesce(axis1_name, 'Size'), axis2_name, coalesce(sort, 99) from src
    on conflict (slug) do update set
      name = excluded.name, axis1_name = excluded.axis1_name, axis2_name = excluded.axis2_name, sort = excluded.sort
    where p_update and (t.name, t.axis1_name, t.axis2_name, t.sort)
      is distinct from (excluded.name, excluded.axis1_name, excluded.axis2_name, excluded.sort)
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;
  result := result || jsonb_build_object('ranges', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  -- Material collections and materials -----------------------------------
  with src as (
    select * from jsonb_to_recordset(coalesce(p->'material_collections', '[]'::jsonb)) as x(
      slug text, name text, kind text, supplier text, supplier_handle text, sort integer, is_active boolean)
  ), up as (
    insert into public.material_collections as t (slug, name, kind, supplier, supplier_handle, sort, is_active)
    select slug, name, coalesce(kind, 'fabric'), supplier, supplier_handle, coalesce(sort, 99), coalesce(is_active, true)
    from src
    on conflict (slug) do update set
      name = excluded.name, kind = excluded.kind, supplier = excluded.supplier,
      supplier_handle = excluded.supplier_handle, sort = excluded.sort
    where p_update and (t.name, t.kind, t.supplier, t.supplier_handle, t.sort)
      is distinct from (excluded.name, excluded.kind, excluded.supplier, excluded.supplier_handle, excluded.sort)
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;
  result := result || jsonb_build_object('material_collections', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  select string_agg(distinct x.collection, ', ') into problems
  from jsonb_to_recordset(coalesce(p->'materials', '[]'::jsonb)) as x(collection text)
  where not exists (select 1 from public.material_collections c where c.slug = x.collection);
  if problems is not null then
    raise exception 'IMPORT_REFERENCE: unknown material collections: %', problems using errcode = 'foreign_key_violation';
  end if;

  with src as (
    select c.id as collection_id, x.*
    from jsonb_to_recordset(coalesce(p->'materials', '[]'::jsonb)) as x(
      collection text, code text, name text, supplier_title text, hex text, image_url text,
      sort integer, is_active boolean, is_swatchable boolean)
    join public.material_collections c on c.slug = x.collection
  ), up as (
    insert into public.materials as t
      (collection_id, code, name, supplier_title, hex, image_url, sort, is_active, is_swatchable)
    select collection_id, code, name, supplier_title, hex, image_url, coalesce(sort, 99),
           coalesce(is_active, true), coalesce(is_swatchable, true)
    from src
    on conflict (collection_id, code) do update set
      name = excluded.name, supplier_title = excluded.supplier_title, hex = excluded.hex,
      image_url = private.import_photo(t.image_url, excluded.image_url),
      sort = excluded.sort, is_swatchable = excluded.is_swatchable
    where p_update and (t.name, t.supplier_title, t.hex, t.image_url, t.sort, t.is_swatchable)
      is distinct from (excluded.name, excluded.supplier_title, excluded.hex,
                        private.import_photo(t.image_url, excluded.image_url), excluded.sort, excluded.is_swatchable)
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;
  result := result || jsonb_build_object('materials', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  -- Products ---------------------------------------------------------------
  drop table if exists pg_temp.import_products;
  create temp table import_products on commit drop as
  select x.*, pt.id as type_id, r.id as range_id, c.id as category_id
  from jsonb_to_recordset(coalesce(p->'products', '[]'::jsonb)) as x(
    slug text, title text, product_type text, range text, primary_category text, categories text[],
    axis1_value text, axis2_value text, base_price numeric, origin text, made_to_order boolean,
    is_featured boolean, is_active boolean, width_cm numeric, depth_cm numeric, height_cm numeric,
    side_a_cm numeric, side_b_cm numeric, specifications jsonb, gallery_images text[], sort integer,
    offer_tier text)
  left join public.product_types pt on pt.slug = x.product_type
  left join public.ranges r on r.slug = x.range
  left join public.categories c on c.slug = x.primary_category;

  select string_agg(format('%s (%s)', i.slug, concat_ws(', ',
           case when i.type_id is null then 'type ' || coalesce(i.product_type, '?') end,
           case when i.range is not null and i.range_id is null then 'range ' || i.range end,
           case when i.primary_category is not null and i.category_id is null then 'category ' || i.primary_category end)), '; ')
  into problems
  from pg_temp.import_products i
  where i.type_id is null
     or (i.range is not null and i.range_id is null)
     or (i.primary_category is not null and i.category_id is null);
  if problems is null then
    select string_agg(distinct format('%s (category %s)', i.slug, cs), '; ') into problems
    from pg_temp.import_products i
    cross join unnest(coalesce(i.categories, '{}')) cs
    where not exists (select 1 from public.categories c where c.slug = cs);
  end if;
  if problems is not null then
    raise exception 'IMPORT_REFERENCE: %', problems using errcode = 'foreign_key_violation';
  end if;

  with up as (
    insert into public.products as t
      (slug, title, product_type_id, range_id, primary_category_id, axis1_value, axis2_value, base_price,
       origin, made_to_order, is_featured, is_active, width_cm, depth_cm, height_cm, side_a_cm, side_b_cm,
       specifications, gallery_images, sort)
    select slug, title, type_id, range_id, category_id, axis1_value, axis2_value, base_price,
           coalesce(origin, 'unspecified'), coalesce(made_to_order, false), coalesce(is_featured, false),
           coalesce(is_active, true), width_cm, depth_cm, height_cm, side_a_cm, side_b_cm,
           coalesce(specifications, '{}'), coalesce(gallery_images, '{}'), coalesce(sort, 99)
    from pg_temp.import_products
    on conflict (slug) do update set
      title = excluded.title, product_type_id = excluded.product_type_id, range_id = excluded.range_id,
      primary_category_id = excluded.primary_category_id, axis1_value = excluded.axis1_value,
      axis2_value = excluded.axis2_value, base_price = excluded.base_price, origin = excluded.origin,
      made_to_order = excluded.made_to_order, width_cm = excluded.width_cm, depth_cm = excluded.depth_cm,
      height_cm = excluded.height_cm, side_a_cm = excluded.side_a_cm, side_b_cm = excluded.side_b_cm,
      specifications = excluded.specifications,
      gallery_images = private.import_gallery(t.gallery_images, excluded.gallery_images),
      sort = excluded.sort
    where p_update and (t.title, t.product_type_id, t.range_id, t.primary_category_id, t.axis1_value,
                        t.axis2_value, t.base_price, t.origin, t.made_to_order, t.width_cm, t.depth_cm,
                        t.height_cm, t.side_a_cm, t.side_b_cm, t.specifications, t.gallery_images, t.sort)
      is distinct from (excluded.title, excluded.product_type_id, excluded.range_id, excluded.primary_category_id,
                        excluded.axis1_value, excluded.axis2_value, excluded.base_price, excluded.origin,
                        excluded.made_to_order, excluded.width_cm, excluded.depth_cm, excluded.height_cm,
                        excluded.side_a_cm, excluded.side_b_cm, excluded.specifications,
                        private.import_gallery(t.gallery_images, excluded.gallery_images), excluded.sort)
    returning t.slug, (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted),
         coalesce(array_agg(slug) filter (where inserted), '{}')
  into n_ins, n_upd, new_slugs
  from up;
  result := result || jsonb_build_object('products', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  -- Each imported product's categories become exactly the imported set
  -- (new products always; existing ones only with p_update).
  with scope as (
    select pr.id as product_id, coalesce(i.categories, '{}') as categories
    from pg_temp.import_products i
    join public.products pr on pr.slug = i.slug
    where p_update or i.slug = any (new_slugs)
  ), wanted as (
    select s.product_id, c.id as category_id
    from scope s cross join unnest(s.categories) cs join public.categories c on c.slug = cs
  ), removed as (
    delete from public.product_categories pc
    using scope s
    where pc.product_id = s.product_id
      and not exists (select 1 from wanted w where w.product_id = pc.product_id and w.category_id = pc.category_id)
    returning 1
  ), added as (
    insert into public.product_categories (product_id, category_id)
    select product_id, category_id from wanted
    on conflict do nothing
    returning 1
  )
  select (select count(*) from added), (select count(*) from removed) into n_ins, n_upd;
  result := result || jsonb_build_object('product_categories', jsonb_build_object('inserted', n_ins, 'removed', n_upd));

  with up as (
    insert into public.offer_product_tiers as t (product_id, tier)
    select pr.id, i.offer_tier
    from pg_temp.import_products i join public.products pr on pr.slug = i.slug
    where i.offer_tier is not null
    on conflict (product_id) do update set tier = excluded.tier
    where p_update and t.tier is distinct from excluded.tier
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;
  result := result || jsonb_build_object('offer_product_tiers', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  -- Variants (colourways). SKUs are kept exactly as given. -------------------
  drop table if exists pg_temp.import_variants;
  create temp table import_variants on commit drop as
  select x.*, pr.id as product_id
  from jsonb_to_recordset(coalesce(p->'variants', '[]'::jsonb)) as x(
    product text, sku text, colour_name text, colour_hex text, material_label text,
    price_adjustment numeric, image_url text, sort integer, is_active boolean)
  left join public.products pr on pr.slug = x.product;

  select string_agg(format('%s (product %s)', v.sku, coalesce(v.product, '?')), '; ') into problems
  from pg_temp.import_variants v where v.product_id is null;
  if problems is not null then
    raise exception 'IMPORT_REFERENCE: %', problems using errcode = 'foreign_key_violation';
  end if;

  with up as (
    insert into public.product_variants as t
      (product_id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort, is_active)
    select product_id, sku, colour_name, colour_hex, material_label, coalesce(price_adjustment, 0), image_url,
           coalesce(sort, 99), coalesce(is_active, true)
    from pg_temp.import_variants
    on conflict (sku) do update set
      product_id = excluded.product_id, colour_name = excluded.colour_name, colour_hex = excluded.colour_hex,
      material_label = excluded.material_label, price_adjustment = excluded.price_adjustment,
      image_url = private.import_photo(t.image_url, excluded.image_url), sort = excluded.sort
    where p_update and (t.product_id, t.colour_name, t.colour_hex, t.material_label, t.price_adjustment, t.image_url, t.sort)
      is distinct from (excluded.product_id, excluded.colour_name, excluded.colour_hex, excluded.material_label,
                        excluded.price_adjustment, private.import_photo(t.image_url, excluded.image_url), excluded.sort)
    returning (t.xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted) into n_ins, n_upd from up;
  result := result || jsonb_build_object('variants', jsonb_build_object('inserted', n_ins, 'updated', n_upd));

  return result;
end;
$$;

revoke all on function private.import_photo(text, text) from public, anon, authenticated;
revoke all on function private.import_gallery(text[], text[]) from public, anon, authenticated;
revoke all on function public.import_catalogue(jsonb, boolean) from public, anon, authenticated;
grant execute on function private.import_photo(text, text) to service_role;
grant execute on function private.import_gallery(text[], text[]) to service_role;
grant execute on function public.import_catalogue(jsonb, boolean) to service_role;

comment on function public.import_catalogue(jsonb, boolean) is
  'Writes the catalogue from scripts/catalogue/build-import.mjs. Repeatable: matched on slugs, SKUs and (collection, code). Service role only.';
