-- Bishop (owner, 5 November 2026): a 6 seater U-shape with a chaise at each
-- end, 180 × 300 × 180 cm, made to order in the UK. Two pieces, each in one
-- colour with the owner's own photo: the scattered back in Silver at £649 and
-- the high back in Truffle at £699. New SKUs in Ashton's pattern (BSBU-SV,
-- BHBU-T). Depth and height as Verona's corners (owner): 95 cm deep with the
-- high back, 90 cm with the scattered back, 90 cm high. The old Bishop listing
-- is still never imported.
--
-- Also for every U-shape: the size sentence gives the back as well as the two
-- sides ("It is 300 cm across the back with two 180 cm sides", was "It
-- measures 180 cm by 180 cm"), and the two Sims U-shapes are listed under
-- U-shaped sofas, like Ashton's and Salone's. No price changes.
--
-- Words follow scripts/catalogue/catalogue-copy.mjs (describeProduct) and the
-- rows follow scripts/catalogue/build-catalogue.mjs, so a rebuild writes the same.

-- The Bishop range ---------------------------------------------------------------

insert into public.ranges (slug, name, axis1_name, axis2_name, description, sort, is_active)
values (
  'bishop', 'Bishop', 'Size', 'Back style',
  'Bishop is a 6 seater U-shape with a long chaise at each end, so two people can stretch out and there is still room for everyone else. Choose the scattered back, piled with loose cushions to plump and arrange, or the high back, with full back cushions for a neater line.',
  19, true
);

insert into public.products (
  slug, title, product_type_id, range_id, primary_category_id, axis1_value, axis2_value,
  base_price, origin, made_to_order, is_featured, is_active,
  width_cm, depth_cm, height_cm, side_a_cm, side_b_cm, specifications, description, highlights, gallery_images, sort
)
select v.slug, v.title, t.id, r.id, c.id, '6 Seater U-Shape', v.back,
  v.price, 'uk', true, false, true,
  300, v.depth, 90, 180, 180, v.specs, v.description, v.highlights, '{}', v.sort
from (values
  ('bishop-high-back-u-shape', 'Bishop 6 Seater U-Shape High Back', 'High Back', 699::numeric, 95::numeric, '{"material":"Fabric","shape":"u-shape","seats":6,"cushions_included":true,"feet":"Polished chrome"}'::jsonb, 'Bishop is a 6 seater U-shape with a long chaise at each end, so two people can stretch out and there is still room for everyone else. Choose the scattered back, piled with loose cushions to plump and arrange, or the high back, with full back cushions for a neater line.' || E'\n\n' || 'It is 300 cm across the back with two 180 cm sides, 95 cm deep and 90 cm high. Made to order in the UK. Choose Truffle, or any fabric from our library.', array['6 seats with a chaise at each end', 'Scattered back or high back', 'Every cushion included', 'Made to order in the UK'], 800),
  ('bishop-scattered-back-u-shape', 'Bishop 6 Seater U-Shape Scattered Back', 'Scattered Back', 649, 90, '{"material":"Fabric","shape":"u-shape","seats":6,"cushions_included":true}'::jsonb, 'Bishop is a 6 seater U-shape with a long chaise at each end, so two people can stretch out and there is still room for everyone else. Choose the scattered back, piled with loose cushions to plump and arrange, or the high back, with full back cushions for a neater line.' || E'\n\n' || 'It is 300 cm across the back with two 180 cm sides, 90 cm deep and 90 cm high. Made to order in the UK. Choose Silver, or any fabric from our library.', array['6 seats with a chaise at each end', 'Scattered back or high back', 'Every cushion included', 'Made to order in the UK'], 801)
) as v(slug, title, back, price, depth, specs, description, highlights, sort)
cross join public.product_types t
cross join public.ranges r
cross join public.categories c
where t.slug = 'sofa' and r.slug = 'bishop' and c.slug = 'u-shaped-sofas';

insert into public.product_categories (product_id, category_id)
select p.id, c.id
from public.products p
cross join public.categories c
where p.slug in ('bishop-high-back-u-shape', 'bishop-scattered-back-u-shape')
  and c.slug in ('corner-sofas', 'fabric-sofas', 'u-shaped-sofas');

insert into public.offer_product_tiers (product_id, tier)
select id, 'STANDARD' from public.products where slug in ('bishop-high-back-u-shape', 'bishop-scattered-back-u-shape');

insert into public.product_variants (product_id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort, is_active)
select p.id, v.sku, v.colour, v.hex, v.material, 0, v.image, 1, true
from (values
  ('bishop-high-back-u-shape', 'BHBU-T', 'Truffle', '#B8A493', 'Fabric', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793824457/Bishop-U-Shape-High-Back-Sofa-Truffle.webp'),
  ('bishop-scattered-back-u-shape', 'BSBU-SV', 'Silver', '#9F978F', 'Fabric', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793824453/Bishop-U-Shape-Scatter-Back-Sofa-Silver.webp')
) as v(slug, sku, colour, hex, material, image)
join public.products p on p.slug = v.slug;

-- Every U-shape: the back in the size sentence, and listed under U-shaped sofas ----

update public.products p set
  description = replace(
    p.description,
    format('It measures %s cm by %s cm', p.side_a_cm::int, p.side_b_cm::int),
    case
      when p.side_a_cm = p.side_b_cm then format('It is %s cm across the back with two %s cm sides', p.width_cm::int, p.side_a_cm::int)
      else format('It is %s cm across the back with sides of %s cm and %s cm', p.width_cm::int, p.side_a_cm::int, p.side_b_cm::int)
    end
  )
where p.specifications ->> 'shape' = 'u-shape'
  and p.width_cm > greatest(p.side_a_cm, p.side_b_cm)
  and p.description like '%It measures %';

insert into public.product_categories (product_id, category_id)
select p.id, c.id
from public.products p
cross join public.categories c
where p.specifications ->> 'shape' = 'u-shape'
  and c.slug = 'u-shaped-sofas'
  and not exists (select 1 from public.product_categories pc where pc.product_id = p.id and pc.category_id = c.id);
