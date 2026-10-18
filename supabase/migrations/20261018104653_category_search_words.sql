-- Phase 20: category titles and descriptions for search, aimed at what people
-- type (docs/KEYWORDS.md): pay cash on delivery, delivery in days, the shape
-- or cover. The Sofas introduction no longer says delivery is free to every
-- mainland address (some areas pay a charge since 17 October 2026).

update public.categories set
  seo_title = 'Sofas delivered in days, pay cash on delivery',
  seo_description = 'Corner, U-shaped, 3+2 and reclining sofas, many made to order in your fabric. Free delivery to most areas in 2–4 working days; pay cash on delivery.',
  description = replace(
    description,
    'Every Heartwell sofa is delivered free to UK Mainland addresses and paid for on the doorstep, once it’s in your room.',
    'Every Heartwell sofa is delivered free to most of mainland Britain, usually in 2 to 4 working days, and paid for on the doorstep, once it’s in your room.'
  )
where slug = 'sofas';

update public.categories set
  seo_title = 'Corner sofas: fast delivery, pay on delivery',
  seo_description = 'Corner sofas in velvet, chenille and leather-look, many made to order in your fabric. Delivered in 2–4 working days to most areas; pay cash on delivery.'
where slug = 'corner-sofas';

update public.categories set
  seo_title = 'U-shaped sofas, made to order, pay on delivery',
  seo_description = 'U-shaped sofas for the whole family, made to order in your choice of fabric and drawn to scale. Free delivery to most areas; pay cash on delivery.'
where slug = 'u-shaped-sofas';

update public.categories set
  seo_title = '3+2 sofa sets: matching 3 and 2 seater sofas',
  seo_description = 'Matching 3+2 sofa sets: a three-seater and a two-seater in the same design and colour, many made to order. Free delivery to most areas, pay on delivery.'
where slug = '3-2-sofa-sets';

update public.categories set
  seo_title = 'Fabric sofas in plush velvet and chenille',
  seo_description = 'Fabric sofas in plush velvet, chenille and crushed velvet, many made to order in the UK in your colour. Free delivery to most areas, pay on delivery.'
where slug = 'fabric-sofas';

update public.categories set
  seo_title = 'Leather-look sofas: tech leather and faux leather',
  seo_description = 'Tech leather, Leather Aire and faux leather sofas, recliners and corners: the look of leather, and wipe-clean. Free delivery to most areas, pay on delivery.'
where slug = 'leather-sofas';

update public.categories set
  seo_title = 'Recliner sofas: electric and manual',
  seo_description = 'Electric and manual recliner sofas, armchairs, 3+2 sets and corners, some with USB ports. Free delivery to most areas, pay cash on delivery.'
where slug = 'recliners';

update public.categories set
  seo_title = 'Electric recliner sofas and corners',
  seo_description = 'Electric recliner sofas and corners that move at the touch of a button, some with USB ports and cup holders. Free delivery to most areas, pay on delivery.'
where slug = 'electric-recliners';

update public.categories set
  seo_title = 'Armchairs and footstools to match your sofa',
  seo_description = 'Armchairs, reclining armchairs and footstools in the same designs as our sofas. Free delivery to most areas, pay cash on delivery.'
where slug = 'armchairs-and-footstools';
