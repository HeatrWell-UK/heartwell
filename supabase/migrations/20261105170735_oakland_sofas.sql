-- Oakland's high back sofas (owner, 5 November 2026, with the owner's photos):
-- 2 seater £429, 3 seater £479 and the 3+2 £599, in the corner's tan faux leather
-- with its rolled, stud-trimmed arms, dark wooden feet and cushions. Made to order
-- in the UK; 168 and 198 cm wide, 90 cm deep and high like the corner. New SKUs in
-- Ashton's pattern (OKHB2-T, OKHB3-T, OKHB32-T). The range's words now cover all
-- four pieces. Rows and words follow scripts/catalogue/build-catalogue.mjs and
-- catalogue-copy.mjs, so a rebuild writes the same.

update public.ranges set description = 'Oakland is faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled. It comes as a 2 or 3 seater and a 3+2 set with a high back, or as a 5 seater corner with a scattered back.' where slug = 'oakland';

update public.products set
  description = 'Oakland is faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled. It comes as a 2 or 3 seater and a 3+2 set with a high back, or as a 5 seater corner with a scattered back.' || E'\n\n' || 'It measures 240 cm by 240 cm, 90 cm deep and 90 cm high. Made to order in the UK. Choose Tan, or any fabric from our library.',
  highlights = array['Faux leather, easy to wipe clean', 'Rolled arms with stud trim', 'Dark wooden feet', 'From a 2 seater to a 5 seater corner', 'Made to order in the UK']
where slug = 'oakland-scattered-back-5-seater-corner';

insert into public.products (
  slug, title, product_type_id, range_id, primary_category_id, axis1_value, axis2_value,
  base_price, origin, made_to_order, is_featured, is_active,
  width_cm, depth_cm, height_cm, specifications, description, highlights, gallery_images, sort
)
select v.slug, v.title, t.id, r.id, c.id, v.size, 'High Back',
  v.price, 'uk', true, false, true,
  v.w, v.d, v.h, v.specs, v.description, v.highlights, '{}', v.sort
from (values
  ('oakland-high-back-2-seater', 'Oakland 2 Seater High Back', '2 Seater', 'leather-sofas', 429::numeric, 168::numeric, 90::numeric, 90::numeric, '{"arms":"Rolled, stud trim","feet":"Dark wood","material":"Faux Leather","back_cushions":"Fibre filled","seat_cushions":"Foam filled","cushions_included":true,"shape":"straight","seats":2}'::jsonb, 'Oakland is faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled. It comes as a 2 or 3 seater and a 3+2 set with a high back, or as a 5 seater corner with a scattered back.' || E'\n\n' || 'It is 168 cm wide, 90 cm deep and 90 cm high. Made to order in the UK. Choose Tan, or any fabric from our library.', array['Faux leather, easy to wipe clean', 'Rolled arms with stud trim', 'Dark wooden feet', 'From a 2 seater to a 5 seater corner', 'Made to order in the UK'], 20),
  ('oakland-high-back-3-seater', 'Oakland 3 Seater High Back', '3 Seater', 'leather-sofas', 479, 198, 90, 90, '{"arms":"Rolled, stud trim","feet":"Dark wood","material":"Faux Leather","back_cushions":"Fibre filled","seat_cushions":"Foam filled","cushions_included":true,"shape":"straight","seats":3}'::jsonb, 'Oakland is faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled. It comes as a 2 or 3 seater and a 3+2 set with a high back, or as a 5 seater corner with a scattered back.' || E'\n\n' || 'It is 198 cm wide, 90 cm deep and 90 cm high. Made to order in the UK. Choose Tan, or any fabric from our library.', array['Faux leather, easy to wipe clean', 'Rolled arms with stud trim', 'Dark wooden feet', 'From a 2 seater to a 5 seater corner', 'Made to order in the UK'], 30),
  ('oakland-high-back-3-2-seater', 'Oakland 3+2 Seater High Back', '3+2 Seater', '3-2-sofa-sets', 599, 198, 90, 90, '{"arms":"Rolled, stud trim","feet":"Dark wood","material":"Faux Leather","back_cushions":"Fibre filled","seat_cushions":"Foam filled","cushions_included":true,"shape":"set","seats":5,"pieces":[{"label":"3 Seater","width_cm":198,"depth_cm":90,"height_cm":90},{"label":"2 Seater","width_cm":168,"depth_cm":90,"height_cm":90}]}'::jsonb, 'Oakland is faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled. It comes as a 2 or 3 seater and a 3+2 set with a high back, or as a 5 seater corner with a scattered back.' || E'\n\n' || 'It is 198 cm wide, 90 cm deep and 90 cm high. Made to order in the UK. Choose Tan, or any fabric from our library.', array['Faux leather, easy to wipe clean', 'Rolled arms with stud trim', 'Dark wooden feet', 'From a 2 seater to a 5 seater corner', 'Made to order in the UK'], 35)
) as v(slug, title, size, primary_category, price, w, d, h, specs, description, highlights, sort)
join public.categories c on c.slug = v.primary_category
cross join public.product_types t
cross join public.ranges r
where t.slug = 'sofa' and r.slug = 'oakland';

insert into public.product_categories (product_id, category_id)
select p.id, c.id
from (values
  ('oakland-high-back-2-seater', 'leather-sofas'),
  ('oakland-high-back-3-seater', 'leather-sofas'),
  ('oakland-high-back-3-2-seater', '3-2-sofa-sets'),
  ('oakland-high-back-3-2-seater', 'leather-sofas')
) as v(slug, category)
join public.products p on p.slug = v.slug
join public.categories c on c.slug = v.category;

insert into public.offer_product_tiers (product_id, tier)
select id, 'STANDARD' from public.products where slug in ('oakland-high-back-2-seater', 'oakland-high-back-3-seater', 'oakland-high-back-3-2-seater');

insert into public.product_variants (product_id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort, is_active)
select p.id, v.sku, v.colour, v.hex, v.material, 0, v.image, 1, true
from (values
  ('oakland-high-back-2-seater', 'OKHB2-T', 'Tan', '#B0693F', 'Faux Leather', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793887985/Oakland-2-Seater-High-Back-Sofa-Tan.webp'),
  ('oakland-high-back-3-seater', 'OKHB3-T', 'Tan', '#B0693F', 'Faux Leather', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793887983/Oakland-3-Seater-High-Back-Sofa-Tan.webp'),
  ('oakland-high-back-3-2-seater', 'OKHB32-T', 'Tan', '#B0693F', 'Faux Leather', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793887980/Oakland-3-2-Seater-High-Back-Sofa-Tan.webp')
) as v(slug, sku, colour, hex, material, image)
join public.products p on p.slug = v.slug;
