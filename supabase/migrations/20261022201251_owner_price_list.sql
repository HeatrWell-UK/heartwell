-- The owner's price list (23 October 2026): the 14 pieces hidden since
-- Phase 17A get prices and sizes, and 12 of them go on sale. Every piece
-- already on sale was checked against the list and already matches it, so
-- nothing a customer sees today changes price. Lily 2 Seater and the Verona
-- Cuddle Chair aren't on the list and stay hidden.
--
-- Also from the list: Michigan's cover is tech air leather (a leather-look
-- fabric, not leather) with wireless charging, Bluetooth speakers, USB and
-- USB-C ports and a storage console; Lily is made to order in the UK; the
-- Verona family set is the scattered back 5 seater corner with a cuddle chair
-- and a footstool. The list's "was" prices aren't used: a was-price shows only
-- for a price Heartwell has charged for 28 days in a row (Phase 21).
--
-- Descriptions follow scripts/catalogue/catalogue-copy.mjs (describeProduct),
-- so a catalogue rebuild writes the same words.

-- Michigan Electric Recliner ----------------------------------------------------

update public.products p set
  base_price = v.price,
  width_cm = v.w, depth_cm = 85, height_cm = 95, side_a_cm = v.a, side_b_cm = v.b,
  specifications = (p.specifications - 'material')
    || jsonb_build_object('material', 'Tech Air Leather', 'usb_ports', true, 'storage', true)
    || coalesce(v.pieces, '{}'::jsonb),
  description = 'Michigan reclines electrically and is upholstered in tech air leather, a leather-look fabric that wipes clean. Adjustable headrests, LED lighting, cup holders, a storage console, wireless charging, Bluetooth speakers and USB and USB-C ports are built in: a sofa made for film nights.'
    || E'\n\n' || v.size_text || ' Ready made, in Black or Grey.',
  highlights = array['Electric reclining with adjustable headrests', 'Tech air leather that wipes clean', 'Wireless charging, Bluetooth speakers, USB and USB-C', 'LED lights, cup holders and a storage console', 'Ready made'],
  is_active = true
from (values
  ('michigan-electric-recliner-2-seater', 599::numeric, 170::numeric, null::numeric, null::numeric, null::jsonb, 'It is 170 cm wide, 85 cm deep and 95 cm high.'),
  ('michigan-electric-recliner-3-seater', 699, 190, null, null, null, 'It is 190 cm wide, 85 cm deep and 95 cm high.'),
  ('michigan-electric-recliner-3-2-seater', 1099, 190, null, null,
    '{"pieces": [{"label": "3 Seater", "width_cm": 190, "depth_cm": 85, "height_cm": 95}, {"label": "2 Seater", "width_cm": 170, "depth_cm": 85, "height_cm": 95}]}',
    'It is 190 cm wide, 85 cm deep and 95 cm high.'),
  ('michigan-electric-recliner-corner', 1099, 270, 230, 270, null, 'It measures 230 cm by 270 cm, 85 cm deep and 95 cm high.')
) as v(slug, price, w, a, b, pieces, size_text)
where p.slug = v.slug;

update public.product_variants pv set material_label = 'Tech Air Leather'
from public.products p
where pv.product_id = p.id and p.slug like 'michigan-electric-recliner-%' and pv.material_label = 'Leather';

-- Rio Chesterfield --------------------------------------------------------------

update public.products p set
  base_price = v.price,
  width_cm = v.w, depth_cm = 90, height_cm = 90,
  specifications = p.specifications || coalesce(v.pieces, '{}'::jsonb),
  description = 'Rio Chesterfield brings the classic Chesterfield scroll arm and deep buttoning to a fabric sofa, standing on dark wooden feet.'
    || E'\n\n' || 'It is ' || v.w || ' cm wide, 90 cm deep and 90 cm high. Made to order in the UK. Choose Silver Grey, or any fabric from our library.',
  is_active = true
from (values
  ('rio-chesterfield-2-seater', 399::numeric, 168::numeric, null::jsonb),
  ('rio-chesterfield-3-seater', 449, 198, null),
  ('rio-chesterfield-4-seater', 549, 235, null),
  ('rio-chesterfield-3-2-seater', 699, 198,
    '{"pieces": [{"label": "3 Seater", "width_cm": 198, "depth_cm": 90, "height_cm": 90}, {"label": "2 Seater", "width_cm": 168, "depth_cm": 90, "height_cm": 90}]}')
) as v(slug, price, w, pieces)
where p.slug = v.slug;

-- Lily (made to order in the UK; the 2 Seater stays hidden until it's priced) -------

update public.products set
  made_to_order = true,
  origin = 'uk',
  highlights = array['Round bolster cushions at each arm', 'Pleated arm panels', 'Deep, plump back cushions', 'Made to order in the UK'],
  description = 'Lily is soft and generous, with plump back cushions, round bolsters at each arm and pleated arm panels. It is a sofa for sinking into at the end of the day.'
    || E'\n\n' || 'Made to order in the UK. Choose Beige, or any fabric from our library.'
where slug = 'lily-2-seater';

update public.products p set
  base_price = v.price,
  made_to_order = true,
  origin = 'uk',
  width_cm = v.w, depth_cm = 90, height_cm = 95, side_a_cm = v.a, side_b_cm = v.b,
  specifications = p.specifications || coalesce(v.pieces, '{}'::jsonb),
  description = 'Lily is soft and generous, with plump back cushions, round bolsters at each arm and pleated arm panels. It is a sofa for sinking into at the end of the day.'
    || E'\n\n' || v.size_text || ' Made to order in the UK. Choose Beige, or any fabric from our library.',
  highlights = array['Round bolster cushions at each arm', 'Pleated arm panels', 'Deep, plump back cushions', 'Made to order in the UK'],
  is_active = true
from (values
  ('lily-3-seater', 449::numeric, 195::numeric, null::numeric, null::numeric, null::jsonb, 'It is 195 cm wide, 90 cm deep and 95 cm high.'),
  ('lily-3-2-seater', 749, 195, null, null,
    '{"pieces": [{"label": "3 Seater", "width_cm": 195, "depth_cm": 90, "height_cm": 95}, {"label": "2 Seater", "width_cm": 168, "depth_cm": 90, "height_cm": 95}]}',
    'It is 195 cm wide, 90 cm deep and 95 cm high.'),
  ('lily-5-seater-corner', 749, 240, 240, 240, null, 'It measures 240 cm by 240 cm, 90 cm deep and 95 cm high.')
) as v(slug, price, w, a, b, pieces, size_text)
where p.slug = v.slug;

-- Verona family set: part of the Verona range, a corner on the floor plan ----------

update public.products set
  title = 'Verona Family Set: 5 Seater Corner, Cuddle Chair and Footstool',
  range_id = (select id from public.ranges where slug = 'verona'),
  axis1_value = 'Family Set',
  axis2_value = 'Scattered Back',
  base_price = 799,
  width_cm = 240, depth_cm = 90, height_cm = 90, side_a_cm = 240, side_b_cm = 240,
  specifications = specifications || '{"shape": "corner", "seats": 5}'::jsonb,
  dimensions_note = 'These are the corner sofa’s measurements; the cuddle chair and footstool come with it.',
  description = 'The Verona family set brings together the scattered back 5 seater corner, a cuddle chair and a footstool, all with Verona’s scrolled arms and all in the same fabric: a whole living room in one order.'
    || E'\n\n' || 'It measures 240 cm by 240 cm, 90 cm deep and 90 cm high. Made to order in the UK. Choose Grey, or any fabric from our library.',
  highlights = array['5 seater corner, cuddle chair and footstool', 'Scrolled arms and a scattered back', 'Every cushion included', 'Made to order in the UK'],
  is_active = true
where slug = 'verona-corner-set';
