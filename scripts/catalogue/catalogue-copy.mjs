// Heartwell's own words for each range: an introduction and a few highlights.
// Written for Heartwell from the facts in the catalogue (sizes, materials,
// arms, feet, cushions) and the owner's photos; no other shop's wording.
// The product's own size and colours are added by describeProduct() below.

export const RANGE_COPY = {
  ashton: {
    intro:
      'Ashton is plush velvet with a soft sheen, deep-buttoned arms and polished chrome feet. Choose the high back for a tailored look and head support, or the scattered back for loose cushions you can plump and arrange.',
    highlights: ['Plush velvet with deep-buttoned arms', 'Polished chrome feet', 'High back or scattered back', 'Every cushion included'],
  },
  sims: {
    intro:
      'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, from the 3+2 set up to a full U-shape.',
    highlights: ['Channel-stitched arm fronts', 'High back or scattered back', 'From a 3+2 set to an armed U-shape', 'Every cushion included'],
  },
  lily: {
    intro:
      'Lily is soft and generous, with plump back cushions, round bolsters at each arm and pleated arm panels. It is a sofa for sinking into at the end of the day.',
    highlights: ['Round bolster cushions at each arm', 'Pleated arm panels', 'Deep, plump back cushions'],
  },
  verona: {
    intro:
      'Verona pairs scrolled arms with a full back or a scattered back of loose cushions. With straight sofas, two corner layouts, a 5 seater corner and a matching armchair, you can furnish a whole room in one range.',
    highlights: ['Scrolled arms', 'Full back or scattered back', 'Straight sofas, corners and a matching armchair', 'Every cushion included'],
  },
  malibu: {
    intro:
      'Malibu keeps things simple: a high back, clean lines and calm, natural colours such as oatmeal and pebble that sit easily with wood and stone.',
    highlights: ['High back for support', 'Natural, easy-to-live-with colours', 'Every cushion included'],
  },
  salone: {
    intro:
      'Salone is a modern, low-fuss shape on polished chrome feet. It comes in everything from a 2 seater to an L-shape and two U-shapes, so it can fill a corner, a wall or an open-plan room.',
    highlights: ['Polished chrome feet', 'From a 2 seater to an armed U-shape', 'Every cushion included'],
  },
  harrison: {
    intro:
      'Harrison is a 5 seater corner with curved arms trimmed in studs, foam seat cushions that keep their shape and fibre-filled back cushions you can sink into.',
    highlights: ['Curved arms with stud trim', 'Foam-filled seat cushions', 'Fibre-filled scatter back'],
  },
  oakland: {
    intro:
      'Oakland is a 5 seater corner in faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled.',
    highlights: ['Faux leather, easy to wipe clean', 'Rolled arms with stud trim', 'Dark wooden feet'],
  },
  olympia: {
    intro:
      'Olympia is a 5 seater corner with deep-buttoned scroll arms on chrome feet: a classic shape with a bright finish. Foam seat cushions keep their shape and the fibre-filled back cushions stay soft.',
    highlights: ['Deep-buttoned scroll arms', 'Chrome feet', 'Foam seats, fibre-filled backs'],
  },
  'rio-chesterfield': {
    intro:
      'Rio Chesterfield brings the classic Chesterfield scroll arm and deep buttoning to a fabric sofa, standing on dark wooden feet.',
    highlights: ['Chesterfield scroll arms, deep buttoned', 'Dark wooden feet', 'Foam seats, fibre-filled backs'],
  },
  ruby: {
    intro:
      'Ruby is a 5 seater corner with square arms edged in chrome studs and chrome feet: crisp and modern. Foam seat cushions and fibre-filled back cushions make it comfortable for every day.',
    highlights: ['Square arms with chrome stud trim', 'Chrome feet', 'Foam seats, fibre-filled backs'],
  },
  shannon: {
    intro:
      'Shannon is a 5 seater corner that mixes fabric seats with faux leather arms, on chrome feet. The faux leather takes the wear where hands rest most.',
    highlights: ['Faux leather arms, fabric seats', 'Chrome feet', 'Foam seats, fibre-filled backs'],
  },
  tango: {
    intro:
      'Tango is a 5 seater corner with scrolled faux leather arms and fabric seats, in a two-tone finish that is easy to live with.',
    highlights: ['Scrolled faux leather arms', 'Two-tone fabric and faux leather', 'Foam seats, fibre-filled backs'],
  },
  windsor: {
    intro:
      'Windsor is a 5 seater corner with deep-buttoned Chesterfield scroll arms on dark wooden feet: traditional in shape, light and fresh in cream.',
    highlights: ['Deep-buttoned Chesterfield scroll arms', 'Dark wooden feet', 'Foam seats, fibre-filled backs'],
  },
  'hannah-electric': {
    intro:
      'Hannah reclines at the touch of a button, in a soft micro fabric. Cup holders and USB ports are built in, so everything you need is within reach.',
    highlights: ['Electric reclining', 'USB ports and cup holders', 'Soft micro fabric'],
  },
  'nova-electric-recliner': {
    intro:
      'Nova reclines electrically and is upholstered in tech leather, which looks and feels like leather and wipes clean. Cup holders, USB ports and storage are built in.',
    highlights: ['Electric reclining', 'Tech leather that wipes clean', 'USB ports, cup holders and storage'],
  },
  'roma-recliner': {
    intro:
      'Roma reclines by hand, so there are no cables or plugs to find room for. It comes in Leather Aire, a soft leather-look fabric, or in grey fabric, as an armchair, a 2 or 3 seater, a 3+2 set or a corner.',
    highlights: ['Manual reclining', 'Leather Aire or fabric', 'Armchair to corner sofa'],
  },
  orlando: {
    intro:
      'Orlando is an electric recliner in tech leather, a leather-look fabric that wipes clean, with LED lighting, cup holders and USB ports built in.',
    highlights: ['Electric reclining', 'Tech leather that wipes clean', 'LED lights, USB ports and cup holders'],
  },
  oxford: {
    intro:
      'Oxford is an electric reclining corner sofa in tech leather, a leather-look fabric that wipes clean, with LED lighting, cup holders and USB ports built in, so the whole family can put their feet up.',
    highlights: ['Electric reclining corner', 'Tech leather that wipes clean', 'LED lights, USB ports and cup holders'],
  },
  'michigan-electric-recliner': {
    intro:
      'Michigan reclines electrically, with LED lighting along the base and a drop-down console with cup holders. A sofa made for film nights.',
    highlights: ['Electric reclining', 'LED lighting', 'Drop-down console with cup holders'],
  },
  footstool: {
    intro: 'A matching footstool with channel-stitched sides: somewhere to rest your feet, or an extra seat when you need one.',
    highlights: ['Channel-stitched sides', 'Matches the Sims range'],
  },
}

const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items.at(-1)}` : items[0])

/** The product's own paragraph: what it is, its size and how it's made. */
export function describeProduct(p, colours) {
  const copy = RANGE_COPY[p.copyKey]
  if (!copy) return { description: null, highlights: [] }
  const parts = [copy.intro]
  const size = []
  if (p.side_a_cm && p.side_b_cm) size.push(`It measures ${p.side_a_cm} cm by ${p.side_b_cm} cm`)
  else if (p.width_cm) size.push(`It is ${p.width_cm} cm wide`)
  if (p.depth_cm) size.push(`${p.depth_cm} cm deep`)
  if (p.height_cm) size.push(`${p.height_cm} cm high`)
  const sizeText = size.length ? `${size.length > 1 ? `${size.slice(0, -1).join(', ')} and ${size.at(-1)}` : size[0]}.` : ''
  const made = p.made_to_order
    ? `Made to order in the UK. Choose ${colours.length ? list(colours) : 'your colour'}, or any fabric from our library.`
    : `Ready made${colours.length ? `, in ${list(colours)}` : ''}.`
  parts.push([sizeText, made].filter(Boolean).join(' '))
  const highlights = [...copy.highlights, p.made_to_order ? 'Made to order in the UK' : 'Ready made']
  return { description: parts.join('\n\n'), highlights }
}
