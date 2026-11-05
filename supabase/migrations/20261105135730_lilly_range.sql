-- Lily is Lilly (owner, 5 November 2026), with the owner's new photos, and the
-- two U-shapes Heartwell sold as Sims are Lilly's (the sister list called them
-- Lily too): the range, the six pieces' names and addresses, and their words.
-- The old addresses redirect permanently (next.config.mjs). SKUs, prices,
-- sizes, colours, categories and offer tiers don't change; none of these
-- pieces has ever been ordered.
--
-- Photos: the new Lilly 2 seater, 3 seater and 5 seater corner; the 3+2 keeps
-- its photo (no new one yet) and shows the new 3 and 2 seater photos after it.
-- The owner's photo files are named after the range they show: the U-shapes
-- and the 3+2 as Lilly-…, and the Sims photos (named Lily-… after the sister
-- list) as Sims-…, so every colourway and the corner and U-shaped category
-- photos move to the new names. The Sims words drop the U-shapes.
--
-- Words follow scripts/catalogue/catalogue-copy.mjs (describeProduct) and the
-- rows follow scripts/catalogue/build-catalogue.mjs, so a rebuild writes the same.

update public.ranges set slug = 'lilly', name = 'Lilly', description = 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' where slug = 'lily';

update public.ranges set description = 'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, as a 3+2 set or a 5 seater corner, with a matching footstool.' where slug = 'sims';

update public.products p set
  slug = v.new_slug, title = v.title, range_id = (select id from public.ranges where slug = 'lilly'), axis2_value = v.axis2,
  primary_category_id = (select id from public.categories where slug = v.primary_category),
  description = v.description, highlights = v.highlights, gallery_images = v.gallery
from (values
  ('lily-2-seater', 'lilly-2-seater', 'Lilly 2 Seater', null, 'fabric-sofas', 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' || E'\n\n' || 'Made to order in the UK. Choose Beige, or any fabric from our library.', array['Round bolster cushions at each arm', 'Channel-stitched arms and base', 'From a 3 seater to a U-shape', 'Every cushion included', 'Made to order in the UK'], '{}'::text[]),
  ('lily-3-seater', 'lilly-3-seater', 'Lilly 3 Seater', null, 'fabric-sofas', 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' || E'\n\n' || 'It is 195 cm wide, 90 cm deep and 95 cm high. Made to order in the UK. Choose Beige, or any fabric from our library.', array['Round bolster cushions at each arm', 'Channel-stitched arms and base', 'From a 3 seater to a U-shape', 'Every cushion included', 'Made to order in the UK'], '{}'::text[]),
  ('lily-3-2-seater', 'lilly-3-2-seater', 'Lilly 3+2 Seater', null, '3-2-sofa-sets', 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' || E'\n\n' || 'It is 195 cm wide, 90 cm deep and 95 cm high. Made to order in the UK. Choose Beige, or any fabric from our library.', array['Round bolster cushions at each arm', 'Channel-stitched arms and base', 'From a 3 seater to a U-shape', 'Every cushion included', 'Made to order in the UK'], array['https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885494/Lilly-3-Seater-Sofa-Beige.webp', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885492/Lilly-2-Seater-Sofa-Beige.webp']),
  ('lily-5-seater-corner', 'lilly-5-seater-corner', 'Lilly 5 Seater Corner', null, 'corner-sofas', 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' || E'\n\n' || 'It measures 240 cm by 240 cm, 90 cm deep and 95 cm high. Made to order in the UK. Choose Beige, or any fabric from our library.', array['Round bolster cushions at each arm', 'Channel-stitched arms and base', 'From a 3 seater to a U-shape', 'Every cushion included', 'Made to order in the UK'], '{}'::text[]),
  ('sims-high-back-u-shape', 'lilly-u-shape', 'Lilly U-Shape', null, 'u-shaped-sofas', 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' || E'\n\n' || 'It is 300 cm across the back with two 180 cm sides, 90 cm deep and 95 cm high. Made to order in the UK. Choose Grey, Black or Navy Blue, or any fabric from our library.', array['Round bolster cushions at each arm', 'Channel-stitched arms and base', 'From a 3 seater to a U-shape', 'Every cushion included', 'Made to order in the UK'], '{}'::text[]),
  ('sims-high-back-armed-u-shape', 'lilly-armed-u-shape', 'Lilly Armed U-Shape', null, 'u-shaped-sofas', 'Lilly is soft and generous, with round bolsters at each arm, channel-stitched arms and base, and plump back cushions to sink into. It comes in sizes from a 3 seater to a 5 seater corner and two U-shapes, so there is one for most rooms.' || E'\n\n' || 'It is 300 cm across the back with sides of 240 cm and 180 cm, 90 cm deep and 95 cm high. Made to order in the UK. Choose Beige or Cream, or any fabric from our library.', array['Round bolster cushions at each arm', 'Channel-stitched arms and base', 'From a 3 seater to a U-shape', 'Every cushion included', 'Made to order in the UK'], '{}'::text[])
) as v(old_slug, new_slug, title, axis2, primary_category, description, highlights, gallery)
where p.slug = v.old_slug;

update public.products p set description = v.description, highlights = v.highlights
from (values
  ('sims-high-back-3-2-seater', 'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, as a 3+2 set or a 5 seater corner, with a matching footstool.' || E'\n\n' || 'It is 195 cm wide, 90 cm deep and 95 cm high. Made to order in the UK. Choose Grey, Black, Navy Blue or Beige, or any fabric from our library.', array['Channel-stitched arm fronts', 'High back or scattered back', '3+2 sets, corners and a footstool', 'Every cushion included', 'Made to order in the UK']),
  ('sims-high-back-5-seater-corner', 'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, as a 3+2 set or a 5 seater corner, with a matching footstool.' || E'\n\n' || 'It measures 240 cm by 240 cm, 90 cm deep and 95 cm high. Made to order in the UK. Choose Grey, Black, Navy Blue, Beige or Silver, or any fabric from our library.', array['Channel-stitched arm fronts', 'High back or scattered back', '3+2 sets, corners and a footstool', 'Every cushion included', 'Made to order in the UK']),
  ('sims-scattered-back-3-2-seater', 'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, as a 3+2 set or a 5 seater corner, with a matching footstool.' || E'\n\n' || 'It is 195 cm wide, 90 cm deep and 90 cm high. Made to order in the UK. Choose Grey, Black, Navy Blue or Beige, or any fabric from our library.', array['Channel-stitched arm fronts', 'High back or scattered back', '3+2 sets, corners and a footstool', 'Every cushion included', 'Made to order in the UK']),
  ('sims-scattered-back-5-seater-corner', 'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, as a 3+2 set or a 5 seater corner, with a matching footstool.' || E'\n\n' || 'It measures 240 cm by 240 cm, 90 cm deep and 90 cm high. Made to order in the UK. Choose Grey, Black, Navy Blue or Beige, or any fabric from our library.', array['Channel-stitched arm fronts', 'High back or scattered back', '3+2 sets, corners and a footstool', 'Every cushion included', 'Made to order in the UK'])
) as v(slug, description, highlights)
where p.slug = v.slug;

update public.product_variants pv set image_url = v.image_url
from (values
  ('LFS-G', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885547/Sims-Footstool-Grey.png'),
  ('LFS-NB', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885550/Sims-Footstool-Navy-Blue.png'),
  ('LHB32-G', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885514/Sims-3-2-Seater-High-Back-Sofa-Grey.png'),
  ('LHB32-BK', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885512/Sims-3-2-Seater-High-Back-Sofa-Black.png'),
  ('LHB32-NB', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885516/Sims-3-2-Seater-High-Back-Sofa-Navy-Blue.png'),
  ('LHB32-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885510/Sims-3-2-Seater-High-Back-Sofa-Beige.png'),
  ('LHB5C-G', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885532/Sims-5-Seater-Corner-High-Back-Sofa-Grey.png'),
  ('LHB5C-BK', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885530/Sims-5-Seater-Corner-High-Back-Sofa-Black.png'),
  ('LHB5C-NB', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885534/Sims-5-Seater-Corner-High-Back-Sofa-Navy-Blue.png'),
  ('LHB5C-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885528/Sims-5-Seater-Corner-High-Back-Sofa-Beige.png'),
  ('LHBAU-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885506/Lilly-Armed-U-Shape-Sofa-Beige.png'),
  ('LHBAU-CR', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885508/Lilly-Armed-U-Shape-Sofa-Cream.png'),
  ('LHBU-G', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885499/Lilly-U-Shape-Sofa-Grey.png'),
  ('LHBU-BK', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885501/Lilly-U-Shape-Sofa-Black.png'),
  ('LHBU-NB', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885504/Lilly-U-Shape-Sofa-Navy-Blue.png'),
  ('LSB32-G', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885523/Sims-3-2-Seater-Scatter-Back-Sofa-Grey.png'),
  ('LSB32-BK', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885521/Sims-3-2-Seater-Scatter-Back-Sofa-Black.png'),
  ('LSB32-NB', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885525/Sims-3-2-Seater-Scatter-Back-Sofa-Navy-Blue.png'),
  ('LSB32-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885519/Sims-3-2-Seater-Scatter-Back-Sofa-Beige.png'),
  ('LSB5C-G', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885543/Sims-5-Seater-Corner-Scatter-Back-Sofa-Grey.png'),
  ('LSB5C-BK', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885541/Sims-5-Seater-Corner-Scatter-Back-Sofa-Black.png'),
  ('LSB5C-NB', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885545/Sims-5-Seater-Corner-Scatter-Back-Sofa-Navy-Blue.png'),
  ('LSB5C-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885539/Sims-5-Seater-Corner-Scatter-Back-Sofa-Beige.png'),
  ('LHB5C-SV', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885537/Sims-5-Seater-Corner-High-Back-Sofa-Silver.png'),
  ('LL2-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885492/Lilly-2-Seater-Sofa-Beige.webp'),
  ('LL3-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885494/Lilly-3-Seater-Sofa-Beige.webp'),
  ('LL32-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885497/Lilly-3-2-Seater-Sofa-Beige.png'),
  ('LL5C-BG', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885489/Lilly-5-Seater-Corner-Sofa-Beige.webp')
) as v(sku, image_url)
where pv.sku = v.sku;

update public.categories c set image_url = v.image_url
from (values
  ('corner-sofas', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885534/Sims-5-Seater-Corner-High-Back-Sofa-Navy-Blue.png'),
  ('u-shaped-sofas', 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1793885508/Lilly-Armed-U-Shape-Sofa-Cream.png')
) as v(slug, image_url)
where c.slug = v.slug;
