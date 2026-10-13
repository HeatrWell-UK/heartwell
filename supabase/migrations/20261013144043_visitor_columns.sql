-- Phase 18 security pass: what a visitor can read straight from the database.
--
-- The publishable key is public, so anything granted to `anon` can be read by
-- anyone with curl, not just through the website. Three gaps closed:
--
-- 1. reviews.order_id was readable on approved reviews, and an order's ID is
--    what opens its confirmation page (name, phone, email, address). Visitors
--    now get the review columns the site shows, nothing else.
-- 2. Back-office names (products.trade_title, ranges.trade_name,
--    materials.supplier_title, material_collections.supplier and
--    supplier_handle) are for the admin and OrderFlow only.
-- 3. track_order could be called directly, skipping the website's rate limit
--    on reference + postcode guesses. Only the server key may call it now.
--
-- Signed-in accounts that aren't admins (Supabase allows sign-ups unless they
-- are switched off) now read none of these tables; admins read everything.
--
-- MAINTENANCE: visitors read these five tables through column grants, so a
-- new column the shop shows must be granted to anon in its own migration.

-- Reviews -------------------------------------------------------------------
drop policy "read approved reviews" on public.reviews;
create policy "visitors read approved reviews" on public.reviews
  for select to anon using (is_approved);
create policy "admins read reviews" on public.reviews
  for select to authenticated using ((select private.is_admin()));

revoke select on public.reviews from anon;
grant select (id, product_id, customer_name, rating, title, comment, image_url, is_approved, approved_at, created_at)
  on public.reviews to anon;

-- Products ------------------------------------------------------------------
drop policy "read active products" on public.products;
create policy "visitors read active products" on public.products
  for select to anon using (is_active);
create policy "admins read products" on public.products
  for select to authenticated using ((select private.is_admin()));

revoke select on public.products from anon;
grant select (
  id, slug, title, product_type_id, range_id, primary_category_id, axis1_value, axis2_value, base_price, origin,
  made_to_order, is_featured, is_active, width_cm, depth_cm, height_cm, seat_height_cm, seat_depth_cm, side_a_cm,
  side_b_cm, dimensions_note, specifications, description, highlights, seo_title, seo_description, gallery_images,
  review_count, average_rating, sort, created_at, updated_at
) on public.products to anon;

-- Ranges --------------------------------------------------------------------
drop policy "read active ranges" on public.ranges;
create policy "visitors read active ranges" on public.ranges
  for select to anon using (is_active);
create policy "admins read ranges" on public.ranges
  for select to authenticated using ((select private.is_admin()));

revoke select on public.ranges from anon;
grant select (id, slug, name, axis1_name, axis2_name, description, sort, is_active, created_at, updated_at)
  on public.ranges to anon;

-- Fabrics -------------------------------------------------------------------
drop policy "read active materials" on public.materials;
create policy "visitors read active materials" on public.materials
  for select to anon using (is_active);
create policy "admins read materials" on public.materials
  for select to authenticated using ((select private.is_admin()));

revoke select on public.materials from anon;
grant select (id, collection_id, code, name, hex, image_url, sort, is_active, is_swatchable, created_at, updated_at)
  on public.materials to anon;

drop policy "read active material collections" on public.material_collections;
create policy "visitors read active material collections" on public.material_collections
  for select to anon using (is_active);
create policy "admins read material collections" on public.material_collections
  for select to authenticated using ((select private.is_admin()));

revoke select on public.material_collections from anon;
grant select (id, slug, name, kind, description, surcharge, sort, is_active, created_at, updated_at)
  on public.material_collections to anon;

-- Order tracking: through the website (rate limited) only --------------------
revoke execute on function public.track_order(text, text) from public, anon, authenticated;
revoke execute on function private.track_order(text, text) from public, anon, authenticated;
grant execute on function public.track_order(text, text) to service_role;
grant execute on function private.track_order(text, text) to service_role;
