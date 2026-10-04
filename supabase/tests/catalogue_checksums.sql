-- Catalogue checksums. Compare with the "Checksums" line printed by
-- scripts/catalogue/build-import.mjs: equal values mean the database holds
-- exactly what was built (products: slug, title, price and dimensions;
-- variants: SKU, product, colour and price adjustment; materials: collection,
-- code, name and colour). Read-only.

select
  (select md5(string_agg(l, ',' order by l collate "C")) from (
     select concat_ws('|', slug, title, base_price::text,
              coalesce(width_cm::text, ''), coalesce(depth_cm::text, ''), coalesce(height_cm::text, ''),
              coalesce(side_a_cm::text, ''), coalesce(side_b_cm::text, '')) as l
     from public.products) s) as products,
  (select md5(string_agg(l, ',' order by l collate "C")) from (
     select concat_ws('|', v.sku, p.slug, coalesce(v.colour_name, ''), v.price_adjustment::text) as l
     from public.product_variants v join public.products p on p.id = v.product_id) s) as variants,
  (select md5(string_agg(l, ',' order by l collate "C")) from (
     select concat_ws('|', c.slug, m.code, m.name, coalesce(m.hex, '')) as l
     from public.materials m join public.material_collections c on c.id = m.collection_id) s) as materials,
  (select count(*) from public.products) as product_count,
  (select count(*) from public.product_variants) as variant_count,
  (select count(*) from public.materials) as material_count;
