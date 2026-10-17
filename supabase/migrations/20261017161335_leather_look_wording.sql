-- Leather-look wording (owner, 17 October 2026): Orlando is covered in tech
-- leather and Roma in Leather Aire, both leather-look fabrics; neither is real
-- leather. Nova's colourways said "Leather" although its specification already
-- said tech leather. The category is renamed "Leather-look Sofas" (its address,
-- /sofas/leather-sofas, stays). The same words are in scripts/catalogue
-- (COVERS in import-config.ts and catalogue-copy.mjs), so a rebuild matches.

update public.products
set specifications = jsonb_set(specifications, '{material}', '"Tech Leather"'),
    description = replace(description,
      'Orlando is an electric recliner in real leather, with',
      'Orlando is an electric recliner in tech leather, a leather-look fabric that wipes clean, with'),
    highlights = array_replace(highlights, 'Real leather', 'Tech leather that wipes clean')
where slug = 'orlando-electric-recliner';

update public.products
set specifications = jsonb_set(specifications, '{material}', '"Leather Aire & Fabric"'),
    description = replace(description,
      'It comes in leather or fabric,',
      'It comes in Leather Aire, a soft leather-look fabric, or in grey fabric,'),
    highlights = array_replace(highlights, 'Leather or fabric', 'Leather Aire or fabric')
where slug like 'roma-recliner-%';

update public.ranges
set description = replace(description,
      'It comes in leather or fabric,',
      'It comes in Leather Aire, a soft leather-look fabric, or in grey fabric,')
where slug = 'roma-recliner';

update public.product_variants v
set material_label = 'Tech Leather'
from public.products p
where p.id = v.product_id
  and v.material_label = 'Leather'
  and (p.slug = 'orlando-electric-recliner' or p.slug like 'nova-electric-recliner-%');

update public.product_variants v
set material_label = 'Leather Aire'
from public.products p
where p.id = v.product_id
  and v.material_label = 'Leather'
  and p.slug like 'roma-recliner-%';

update public.categories
set name = 'Leather-look Sofas',
    description = 'Leather-look sofas keep a smart shape and suit busy homes. The range includes recliners, electric recliners and corner sofas.'
      || E'\n\n'
      || 'They’re covered in leather-look materials such as faux leather, tech leather and Leather Aire, and each sofa’s page names its covering, so you know exactly what you’re buying.',
    seo_title = 'Leather-look sofas and recliners',
    seo_description = 'Faux leather, tech leather and Leather Aire sofas, including recliners, electric recliners and corners. Free UK Mainland delivery, pay on delivery.'
where slug = 'leather-sofas';
