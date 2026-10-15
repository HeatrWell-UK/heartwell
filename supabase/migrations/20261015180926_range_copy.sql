-- Range copy (Phase 18C R2): each range's introduction, in Heartwell's own
-- words (the same intros the product descriptions start from,
-- scripts/catalogue/catalogue-copy.mjs), shown at the top of its range page.
-- Only empty descriptions are filled, so anything edited later is never
-- overwritten. Slugs without a range yet are simply skipped.

with copy(slug, description) as (values
  ('ashton',
   $t$Ashton is plush velvet with a soft sheen, deep-buttoned arms and polished chrome feet. Choose the high back for a tailored look and head support, or the scattered back for loose cushions you can plump and arrange.$t$),
  ('sims',
   $t$Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, from the 3+2 set up to a full U-shape.$t$),
  ('lily',
   $t$Lily is soft and generous, with plump back cushions, round bolsters at each arm and pleated arm panels. It is a sofa for sinking into at the end of the day.$t$),
  ('verona',
   $t$Verona pairs scrolled arms with a full back or a scattered back of loose cushions. With straight sofas, two corner layouts, a 5 seater corner and a matching armchair, you can furnish a whole room in one range.$t$),
  ('malibu',
   $t$Malibu keeps things simple: a high back, clean lines and calm, natural colours such as oatmeal and pebble that sit easily with wood and stone.$t$),
  ('salone',
   $t$Salone is a modern, low-fuss shape on polished chrome feet. It comes in everything from a 2 seater to an L-shape and two U-shapes, so it can fill a corner, a wall or an open-plan room.$t$),
  ('harrison',
   $t$Harrison is a 5 seater corner with curved arms trimmed in studs, foam seat cushions that keep their shape and fibre-filled back cushions you can sink into.$t$),
  ('oakland',
   $t$Oakland is a 5 seater corner in faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled.$t$),
  ('olympia',
   $t$Olympia is a 5 seater corner with deep-buttoned scroll arms on chrome feet: a classic shape with a bright finish. Foam seat cushions keep their shape and the fibre-filled back cushions stay soft.$t$),
  ('rio-chesterfield',
   $t$Rio Chesterfield brings the classic Chesterfield scroll arm and deep buttoning to a fabric sofa, standing on dark wooden feet.$t$),
  ('ruby',
   $t$Ruby is a 5 seater corner with square arms edged in chrome studs and chrome feet: crisp and modern. Foam seat cushions and fibre-filled back cushions make it comfortable for every day.$t$),
  ('shannon',
   $t$Shannon is a 5 seater corner that mixes fabric seats with faux leather arms, on chrome feet. The faux leather takes the wear where hands rest most.$t$),
  ('tango',
   $t$Tango is a 5 seater corner with scrolled faux leather arms and fabric seats, in a two-tone finish that is easy to live with.$t$),
  ('windsor',
   $t$Windsor is a 5 seater corner with deep-buttoned Chesterfield scroll arms on dark wooden feet: traditional in shape, light and fresh in cream.$t$),
  ('hannah-electric',
   $t$Hannah reclines at the touch of a button, in a soft micro fabric. Cup holders and USB ports are built in, so everything you need is within reach.$t$),
  ('nova-electric-recliner',
   $t$Nova reclines electrically and is upholstered in tech leather, which looks and feels like leather and wipes clean. Cup holders, USB ports and storage are built in.$t$),
  ('roma-recliner',
   $t$Roma reclines by hand, so there are no cables or plugs to find room for. It comes in leather or fabric, as an armchair, a 2 or 3 seater, a 3+2 set or a corner.$t$),
  ('orlando',
   $t$Orlando is an electric recliner in real leather, with LED lighting, cup holders and USB ports built in.$t$),
  ('oxford',
   $t$Oxford is an electric reclining corner sofa with LED lighting, cup holders and USB ports built in, so the whole family can put their feet up.$t$),
  ('michigan-electric-recliner',
   $t$Michigan reclines electrically, with LED lighting along the base and a drop-down console with cup holders. A sofa made for film nights.$t$),
  ('footstool',
   $t$A matching footstool with channel-stitched sides: somewhere to rest your feet, or an extra seat when you need one.$t$)
)
update public.ranges r
set description = copy.description
from copy
where r.slug = copy.slug
  and coalesce(r.description, '') = '';
