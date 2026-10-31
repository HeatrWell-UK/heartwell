// Close-ups of each range, cut from the owner's own photos (audit A2): the
// product page's gallery, the Meta and Google feeds and the social posts
// (design/social/products) all read this one list.
//
// Each is a square of a piece's original photo (1,254 px): x and y are its
// top-left corner and s its side, in the original's pixels. The same square is
// cut from that piece's photo in the colour being looked at when it was checked
// on that colour (most colours of a piece are photographed in the same place,
// but not all: Hannah's beige and Michigan's grey sit differently).
//
//   piece     shown only on pieces whose slug contains this ("scattered-back",
//             "manual"): for a detail that only some sizes or styles have
//   material  the label names the cover, so it's shown only on colourways in
//             that cover (material_label), and never once another fabric is chosen
//   colours   the colourways ("Grey Plush Velvet": colour and material_label) the
//             square was checked on, the one it was measured on first. Without
//             it, only the piece's first colourway. A colourway not listed sees
//             the first one's close-up, named on the photo ("…, in grey").

export interface CloseUp {
  label: string
  /** The product (slug) whose photo it's cut from. */
  photo: string
  x: number
  y: number
  s: number
  piece?: string
  material?: string
  colours?: string[]
}

const SIMS = ['Grey Plush Velvet', 'Black Plush Velvet', 'Navy Blue Plush Velvet', 'Beige Plush Velvet']
const ROMA_LEATHER = ['Grey Leather Aire', 'Black Leather Aire', 'Brown Leather Aire']
const MICHIGAN = ['Black Tech Air Leather', 'Grey Tech Air Leather']

export const CLOSE_UPS: Record<string, CloseUp[]> = {
  ashton: [
    { label: 'Deep-buttoned arms', photo: 'ashton-high-back-2-seater', x: 60, y: 600, s: 330 },
    { label: 'Polished chrome feet', photo: 'ashton-high-back-2-seater', x: 70, y: 820, s: 240 },
    { label: 'Plush velvet with a soft sheen', photo: 'ashton-high-back-2-seater', x: 330, y: 500, s: 300, material: 'Plush Velvet' },
  ],
  verona: [
    { label: 'Scrolled arms', photo: 'verona-high-back-2-seater', x: 40, y: 560, s: 340 },
    { label: 'Scattered back of loose cushions', photo: 'verona-scattered-back-2-seater', x: 440, y: 400, s: 360, piece: 'scattered-back' },
    { label: 'Soft textured fabric', photo: 'verona-high-back-2-seater', x: 300, y: 640, s: 240, material: 'Fabric' },
  ],
  'roma-recliner': [
    { label: 'Pull the lever to recline', photo: 'roma-recliner-manual-armchair', x: 250, y: 620, s: 240, piece: 'manual', colours: ['Grey Leather Aire', 'Grey Fabric'] },
    { label: 'Padded arms', photo: 'roma-recliner-manual-armchair', x: 780, y: 560, s: 300, colours: [...ROMA_LEATHER, 'Grey Fabric'] },
    { label: 'Leather Aire, soft and leather-look', photo: 'roma-recliner-manual-armchair', x: 360, y: 400, s: 330, material: 'Leather Aire', colours: ROMA_LEATHER },
  ],
  salone: [
    { label: 'Plush velvet cushions', photo: 'salone-2-seater', x: 600, y: 480, s: 300, material: 'Plush Velvet' },
    { label: 'Polished chrome feet', photo: 'salone-2-seater', x: 140, y: 760, s: 220 },
    { label: 'Clean, square arms', photo: 'salone-2-seater', x: 880, y: 560, s: 300 },
  ],
  sims: [
    { label: 'Channel-stitched arms', photo: 'sims-high-back-3-2-seater', x: 30, y: 570, s: 300, colours: SIMS },
    { label: 'Plush velvet', photo: 'sims-high-back-3-2-seater', x: 300, y: 500, s: 260, material: 'Plush Velvet', colours: SIMS },
    { label: 'Loose scatter cushions', photo: 'sims-scattered-back-3-2-seater', x: 150, y: 560, s: 330, piece: 'scattered-back', colours: SIMS },
  ],
  'nova-electric-recliner': [
    { label: 'Reclines at the touch of a button', photo: 'nova-electric-recliner-3-2-seater', x: 120, y: 520, s: 360 },
    { label: 'Tech leather that wipes clean', photo: 'nova-electric-recliner-2-seater', x: 300, y: 520, s: 260, material: 'Tech Leather' },
    { label: 'Cup holders and storage', photo: 'nova-electric-recliner-2-seater', x: 470, y: 600, s: 300 },
  ],
  malibu: [
    { label: 'Bolster and scatter cushions', photo: 'malibu-high-back-2-seater', x: 250, y: 500, s: 340 },
    { label: 'Deep-buttoned base', photo: 'malibu-high-back-2-seater', x: 380, y: 740, s: 260 },
    { label: 'Stud trim and turned feet', photo: 'malibu-high-back-2-seater', x: 100, y: 760, s: 260 },
  ],
  lily: [
    { label: 'Pleated arms and round bolsters', photo: 'lily-3-seater', x: 60, y: 540, s: 330 },
    { label: 'Deep, plump back cushions', photo: 'lily-3-seater', x: 360, y: 440, s: 300 },
    { label: 'Soft, generous seats', photo: 'lily-3-seater', x: 300, y: 600, s: 260 },
  ],
  'michigan-electric-recliner': [
    { label: 'Cup holders and wireless charging', photo: 'michigan-electric-recliner-2-seater', x: 620, y: 560, s: 300 },
    { label: 'Bluetooth speakers', photo: 'michigan-electric-recliner-2-seater', x: 500, y: 360, s: 280, colours: MICHIGAN },
    { label: 'LED lights along the base', photo: 'michigan-electric-recliner-2-seater', x: 600, y: 790, s: 300, colours: MICHIGAN },
  ],
  'hannah-electric': [
    { label: 'Reclines at the touch of a button', photo: 'hannah-electric-3-2-seater', x: 440, y: 480, s: 300 },
    { label: 'Cup holders built in', photo: 'hannah-electric-3-2-seater', x: 780, y: 470, s: 260 },
    { label: 'Soft micro fabric', photo: 'hannah-electric-3-2-seater', x: 30, y: 540, s: 300, material: 'Fabric' },
  ],
  'rio-chesterfield': [
    { label: 'Chesterfield scroll arms', photo: 'rio-chesterfield-2-seater', x: 60, y: 540, s: 340 },
    { label: 'Deep buttoning', photo: 'rio-chesterfield-2-seater', x: 420, y: 760, s: 240 },
    { label: 'Dark wooden feet', photo: 'rio-chesterfield-2-seater', x: 890, y: 820, s: 240 },
  ],
  harrison: [
    { label: 'Curved arms with stud trim', photo: 'harrison-scattered-back-5-seater-corner', x: 60, y: 560, s: 320 },
    { label: 'Foam seat cushions', photo: 'harrison-scattered-back-5-seater-corner', x: 250, y: 600, s: 260 },
    { label: 'Fibre-filled back cushions', photo: 'harrison-scattered-back-5-seater-corner', x: 380, y: 480, s: 300 },
  ],
  oakland: [
    { label: 'Rolled arms with stud trim', photo: 'oakland-scattered-back-5-seater-corner', x: 20, y: 540, s: 300 },
    { label: 'Dark wooden feet', photo: 'oakland-scattered-back-5-seater-corner', x: 860, y: 700, s: 200 },
    { label: 'Faux leather that wipes clean', photo: 'oakland-scattered-back-5-seater-corner', x: 400, y: 520, s: 280, material: 'Faux Leather' },
  ],
  olympia: [
    { label: 'Deep-buttoned scroll arms', photo: 'olympia-scattered-back-5-seater-corner', x: 20, y: 540, s: 320 },
    { label: 'Chrome feet', photo: 'olympia-scattered-back-5-seater-corner', x: 140, y: 760, s: 200 },
    { label: 'Plush velvet', photo: 'olympia-scattered-back-5-seater-corner', x: 260, y: 480, s: 260, material: 'Plush Velvet' },
  ],
  ruby: [
    { label: 'Square arms with chrome studs', photo: 'ruby-scattered-back-5-seater-corner', x: 30, y: 560, s: 300 },
    { label: 'Chrome feet', photo: 'ruby-scattered-back-5-seater-corner', x: 120, y: 740, s: 200 },
    { label: 'Fibre-filled back cushions', photo: 'ruby-scattered-back-5-seater-corner', x: 440, y: 480, s: 260 },
  ],
  shannon: [
    { label: 'Faux leather arms', photo: 'shannon-scattered-back-5-seater-corner', x: 20, y: 580, s: 300, material: 'Fabric & Faux Leather' },
    { label: 'Chrome feet', photo: 'shannon-scattered-back-5-seater-corner', x: 130, y: 770, s: 200 },
    { label: 'Fabric seats, fibre-filled backs', photo: 'shannon-scattered-back-5-seater-corner', x: 300, y: 560, s: 260, material: 'Fabric & Faux Leather' },
  ],
  tango: [
    { label: 'Scrolled faux leather arms', photo: 'tango-scattered-back-5-seater-corner', x: 20, y: 540, s: 300, material: 'Fabric & Faux Leather' },
    { label: 'Two-tone fabric and faux leather', photo: 'tango-scattered-back-5-seater-corner', x: 300, y: 560, s: 280, material: 'Fabric & Faux Leather' },
    { label: 'Fibre-filled back cushions', photo: 'tango-scattered-back-5-seater-corner', x: 420, y: 440, s: 260 },
  ],
  windsor: [
    { label: 'Deep-buttoned Chesterfield arms', photo: 'windsor-scattered-back-5-seater-corner', x: 20, y: 560, s: 320 },
    { label: 'Dark wooden feet', photo: 'windsor-scattered-back-5-seater-corner', x: 900, y: 740, s: 200 },
    { label: 'Cream chenille', photo: 'windsor-scattered-back-5-seater-corner', x: 300, y: 480, s: 260, material: 'Chenille' },
  ],
}
