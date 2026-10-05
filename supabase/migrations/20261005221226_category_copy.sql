-- Category copy (Phase 9): an introduction, more detail further down the page,
-- and a search title and description for each category, in Heartwell's own
-- words. Only empty fields are filled, so anything edited in the admin later
-- is never overwritten. Paragraphs are separated by a blank line.

with copy(slug, description, seo_title, seo_description) as (values
  ('sofas',
   $t$Every Heartwell sofa is delivered free to UK Mainland addresses and paid for on the doorstep, once it’s in your room. Choose the shape that fits your space, then the colour, and on made-to-order pieces, the fabric.

Not sure what will fit? Each sofa’s page has its measurements drawn to scale and a quick check for your door width. If you’d rather ask, we’re happy to help you measure.$t$,
   'Sofas: corner, U-shaped, 3+2 and recliners',
   'Corner, U-shaped, 3+2 and reclining sofas, many made to order in your choice of fabric. Free UK Mainland delivery and nothing to pay until it arrives.'),

  ('corner-sofas',
   $t$A corner sofa seats more people in less floor space by tucking into the angle of a room. Ours range from four-seat corners to large five-seaters, many made to order in the fabric you choose.

Some corners come in two versions, longer on the left or on the right. The drawing on each sofa’s page shows the length of both sides, so you can check which way round suits your room. The longer side usually goes against your longest wall.

Corner sofas arrive in sections, which makes them easier to carry through doors and up stairs. Each section is about as deep as the sofa, so that’s the measurement to compare with your narrowest doorway.$t$,
   'Corner sofas, made to order and paid for on delivery',
   'Corner sofas in fabric and leather-look finishes, many made to order in your choice of fabric. Free UK Mainland delivery and nothing to pay until it arrives.'),

  ('u-shaped-sofas',
   $t$A U-shaped sofa wraps around three sides, so everyone faces the same way, whether that’s the television or each other. They suit open-plan rooms and long evenings with the whole family.

Measure the room before you fall for one: a U-shape needs space along three walls, or room to stand free in a large room. The drawing on each sofa’s page shows the back and both sides in centimetres.$t$,
   'U-shaped sofas for the whole family',
   'U-shaped sofas that seat the whole family, made to order in your choice of fabric. Measurements drawn to scale, free UK Mainland delivery and pay on delivery.'),

  ('3-2-sofa-sets',
   $t$A 3+2 set gives you a three-seater and a two-seater in the same design and colour, so the room looks finished from day one. They’re easy to arrange around a fireplace or television, and easy to rearrange later.

Both pieces arrive together, and each set’s page lists the measurements of the three-seater and the two-seater separately.$t$,
   '3+2 sofa sets: matching three and two seaters',
   'Matching 3+2 sofa sets: a three-seater and a two-seater in the same design and colour, many made to order. Free UK Mainland delivery, pay on delivery.'),

  ('fabric-sofas',
   $t$Fabric sofas feel warm and soft from the first sit, and come in far more colours than leather. Many of ours are made to order in the UK, so you can have the colour shown or choose another from our fabric library.

Velvet has a deep, rich colour that catches the light; chenille is soft, hard-wearing and forgiving with family life. Every fabric is shown on our fabrics page, with its name and code.$t$,
   'Fabric sofas in plush velvet, chenille and more',
   'Fabric sofas in plush velvet, chenille, crushed velvet and more, many made to order in the UK in your choice of colour. Free UK Mainland delivery, pay on delivery.'),

  ('leather-sofas',
   $t$Leather and leather-look sofas wipe clean, suit busy homes and keep a smart shape. The range includes recliners, electric recliners and corner sofas.

Coverings differ from sofa to sofa, and each sofa’s page names the one it’s made in, so you know exactly what you’re buying.$t$,
   'Leather and leather-look sofas',
   'Leather and leather-look sofas, including recliners, electric recliners and corners. Each page names its covering. Free UK Mainland delivery, pay on delivery.'),

  ('recliners',
   $t$A recliner sofa lets you put your feet up without a footstool. Manual recliners work without power; electric recliners move at the touch of a button and stop wherever you like.

Check the space behind and in front of the sofa so the seats can recline fully. Each recliner’s page lists its measurements and whether it reclines by hand or electrically.$t$,
   'Recliner sofas, manual and electric',
   'Manual and electric recliner sofas, armchairs and sets, with measurements on every page. Free UK Mainland delivery and nothing to pay until it arrives.'),

  ('electric-recliners',
   $t$Electric recliners move at the touch of a button, so the footrest and back go exactly where you want them, with no effort. They plug into an ordinary socket, so plan for one nearby.

Some have USB ports or cup holders built in; each sofa’s page lists exactly what’s included.$t$,
   'Electric recliner sofas',
   'Electric recliner sofas and corners that move at the touch of a button, with features listed on every page. Free UK Mainland delivery, pay on delivery.'),

  ('armchairs-and-footstools',
   $t$An armchair or footstool to go with your sofa, or a single chair for a reading corner. They’re made in the same designs as our sofas, so they sit together naturally.$t$,
   'Armchairs and footstools',
   'Armchairs and footstools in the same designs as our sofas, including reclining armchairs. Free UK Mainland delivery, pay on delivery.')
)
update public.categories c
set description = coalesce(c.description, copy.description),
    seo_title = coalesce(c.seo_title, copy.seo_title),
    seo_description = coalesce(c.seo_description, copy.seo_description)
from copy
where c.slug = copy.slug
  and (c.description is null or c.seo_title is null or c.seo_description is null);
