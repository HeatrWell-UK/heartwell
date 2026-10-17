-- Delivery is no longer free everywhere on the mainland (migration
-- delivery_areas), so the category search descriptions stop saying so.
-- "Free delivery to most of Britain" keeps them within what Google shows.

update public.categories
set seo_description = replace(replace(seo_description,
      'Free UK Mainland delivery', 'Free delivery to most of Britain'),
      'free UK Mainland delivery', 'free delivery to most of Britain')
where seo_description ilike '%UK Mainland delivery%';
