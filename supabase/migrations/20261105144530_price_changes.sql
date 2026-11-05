-- The owner's price changes (5 November 2026): twelve sets, corners and
-- U-shapes in Ashton, Lilly and Malibu, all lower. Every change is kept in
-- product_price_log (the Phase 21 trigger). No was-prices: the old prices were
-- charged from 16 October, under the 28 days in a row a was-price needs.
-- Orders already placed keep the prices they were placed at.
-- scripts/catalogue/build-catalogue.mjs (PRICE) writes the same in a rebuild.

update public.products p set base_price = v.price
from (values
  ('ashton-high-back-5-seater-corner', 699::numeric),
  ('ashton-high-back-3-2-seater', 699),
  ('ashton-high-back-u-shape', 1099),
  ('ashton-scattered-back-5-seater-corner', 679),
  ('ashton-scattered-back-3-2-seater', 679),
  ('ashton-scattered-back-u-shape', 1049),
  ('lilly-5-seater-corner', 649),
  ('lilly-3-2-seater', 649),
  ('lilly-u-shape', 799),
  ('lilly-armed-u-shape', 899),
  ('malibu-high-back-5-seater-corner', 649),
  ('malibu-high-back-3-2-seater', 659)
) as v(slug, price)
where p.slug = v.slug;
