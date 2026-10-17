-- Oxford electric corner is covered in tech leather (owner, 17 October 2026):
-- its colourways said "Leather" and its specification named no cover. Same
-- words as Orlando and Nova; the catalogue scripts carry the same (COVERS in
-- import-config.ts, catalogue-copy.mjs).

update public.products
set specifications = specifications || '{"material": "Tech Leather"}'::jsonb,
    description = replace(description,
      'Oxford is an electric reclining corner sofa with LED lighting,',
      'Oxford is an electric reclining corner sofa in tech leather, a leather-look fabric that wipes clean, with LED lighting,'),
    highlights = array['Electric reclining corner', 'Tech leather that wipes clean', 'LED lights, USB ports and cup holders']
      || array_remove(array_remove(array_remove(highlights, 'Electric reclining corner'), 'LED lights'), 'USB ports and cup holders')
where slug = 'oxford-electric-corner';

update public.product_variants v
set material_label = 'Tech Leather'
from public.products p
where p.id = v.product_id
  and v.material_label = 'Leather'
  and p.slug = 'oxford-electric-corner';
