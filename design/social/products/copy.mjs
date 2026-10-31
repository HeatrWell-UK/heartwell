// The words for each range's post that aren't data: the cover photo and the
// line under the name in its alcove, a detail for alt text, and the captions.
// Sizes, prices, fabric counts and the link are filled in from the live shop
// by build.mjs, so a caption never states a stale price.
//
// Voice (docs/DESIGN.md): plain and specific, British, warm, never pushy. No
// urgency, no was-prices, no claims the site doesn't make: features come from
// each range's description and highlights, or are plainly visible in its photos.
// One call to action. Instagram links aren't clickable, so it says "the link in
// our bio"; Facebook gets the range page's link, tagged so the admin sees where
// visits came from.
//
// Ranges are listed in posting order: the first is drawn in the velvet style,
// the second bold, the third editorial, then round again (styles.mjs), unless
// an entry sets `style`. Per range:
//   short       the name on the covers when the range's name is long ("Michigan Electric Recliner" → "Michigan")
//   cover       the piece whose photo leads the post; coverColour picks its colour
//   tagline     the line under the name (velvet cover, alt text); sub: the editorial cover's line
//   details     close-ups, from src/content/close-ups.ts (merged in at the end of this file)
//   detailsLine the sentence under the close-ups
//   callouts    labels on the bold cover's photo: the dot and the label's top-left, in px on the 1080 px photo
//   coverTile   the editorial cover's second photo and its label (default: a size away from the cover's)
//   photoNotes  something in a photo that doesn't come with the piece, said on the photo ("slug" or "slug|Colour")
//   optionSubs  a line under a piece's name (what a set holds)
//   altDetail   a detail for every photo's alt text

import { CLOSE_UPS } from '../../../src/content/close-ups.ts'

const WHATSAPP = '07460 669864'
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const words = (n) => NUMBERS[n] ?? String(n)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const low = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const withMoney = (d) => d.sizes.map((s) => ({ ...s, money: d.money(s.from) }))
const list = (sizes) => sizes.map((s) => `${s.label} from ${s.money}`).join('\n')

/** "from £249 for the armchair to £799 for the family set" */
function span(d) {
  const s = [...d.sizes].sort((a, b) => a.from - b.from)
  return `from ${d.money(s[0].from)} for the ${low(s[0].label)} to ${d.money(s.at(-1).from)} for the ${low(s.at(-1).label)}`
}

const PAY_IG = 'Free delivery to most of mainland Britain, and nothing to pay until it’s in your room: cash or bank transfer to the driver.'
const PAY_FB = 'Free delivery to most of mainland Britain, and nothing to pay until it’s in your room.'
const ASK_IG = `Order through the link in our bio, or message us on WhatsApp: ${WHATSAPP}.`

const made = (d) =>
  d.madeToOrder ? `Made to order in the UK, in the ${d.shown} shown or any of our ${d.fabrics} fabrics${d.samePrice ? ', all at the same price' : ''}.` : `Ready made, in ${d.colours}.`

/**
 * The three captions from a range's own lines: hook (Instagram's first line),
 * fbHook (Facebook's, shorter), altHook (the second Instagram option), story
 * (the range's description) and tags.
 */
function post({ hook, fbHook, altHook, story, tags }) {
  const many = (d) => d.sizes.length > 1
  return {
    instagram: (d) =>
      [hook(d), '', story, '', many(d) ? `Swipe for every size, with measurements and prices:\n${list(withMoney(d))}` : 'Swipe for the close-ups and every measurement.', '', made(d), '', PAY_IG, '', ASK_IG, '', tags].join('\n'),
    instagramAlt: (d) =>
      [altHook, '', `${story} ${many(d) ? `${cap(words(d.sizes.length))} sizes, ${span(d)}.` : `It’s ${d.from}.`} ${PAY_FB}`, '', `Swipe for ${many(d) ? 'every size and price' : 'the close-ups and measurements'}. ${ASK_IG}`, '', tags].join('\n'),
    facebook: (d) =>
      [fbHook(d), '', story, '', ...(many(d) ? [list(withMoney(d)), ''] : []), made(d), '', PAY_FB, '', `${many(d) ? 'See every size and measurement' : 'See it on our website'}: ${d.link}`, `Or message us on WhatsApp: ${WHATSAPP}`].join('\n'),
  }
}

export const COPY = {
  // 1 · velvet
  ashton: {
    cover: 'ashton-high-back-u-shape',
    tagline: 'Plush velvet · Deep-buttoned · Made in the UK',
    sub: 'Plush velvet, deep-buttoned, made in the UK',
    detailsLine: 'Every cushion included, and made to order in the UK.',
    callouts: [
      { label: 'Plush velvet', dot: [540, 470], pill: [440, 290] },
      { label: 'Deep-buttoned arms', dot: [160, 640], pill: [40, 790] },
      { label: 'Chrome feet', dot: [280, 730], pill: [370, 850] },
    ],
    altDetail: 'with deep-buttoned arms and polished chrome feet',
    // The high back 3+2 photo has a footstool in it; the set is two sofas (no Ashton footstool is sold).
    photoNotes: { 'ashton-high-back-3-2-seater': 'Footstool not included' },
    instagram: (d) =>
      [
        `Deep-buttoned velvet in ${words(d.sizes.length)} sizes, from ${d.from}. This is Ashton.`,
        '',
        'Plush velvet with a soft sheen, deep-buttoned arms and polished chrome feet. Choose the high back for a tailored look and head support, or the scattered back for loose cushions you can plump and arrange.',
        '',
        'Swipe for every size, with measurements and prices:',
        list(withMoney(d)),
        '',
        made(d),
        '',
        PAY_IG,
        '',
        ASK_IG,
        '',
        '#velvetsofa #cornersofa #ushapesofa #greysofa #madeintheuk',
      ].join('\n'),
    instagramAlt: (d) =>
      [
        'A U-shape sofa, and nothing to pay until it’s in your room.',
        '',
        'That’s how every Ashton works: choose it, confirm your order, and pay the driver in cash or by bank transfer once it’s home. Delivery is free to most of mainland Britain.',
        '',
        `Ashton is plush velvet with deep-buttoned arms and polished chrome feet, made to order in the UK. ${cap(words(d.sizes.length))} sizes, ${span(d)}, each with a high back or a scattered back. Swipe for every size and price.`,
        '',
        ASK_IG,
        '',
        '#velvetsofa #ushapesofa #cornersofa #greysofa #madeintheuk',
      ].join('\n'),
    facebook: (d) =>
      [
        `Ashton: deep-buttoned velvet in ${words(d.sizes.length)} sizes, from ${d.from}.`,
        '',
        `Plush velvet with a soft sheen and polished chrome feet, made to order in the UK in grey or any of our ${d.fabrics} fabrics${d.samePrice ? ', at the same price' : ''}. Every size comes with a high back or a scattered back:`,
        '',
        list(withMoney(d)),
        '',
        PAY_FB,
        '',
        `See every size and measurement: ${d.link}`,
        `Or message us on WhatsApp: ${WHATSAPP}`,
      ].join('\n'),
  },

  // 2 · bold
  verona: {
    cover: 'verona-scattered-back-5-seater-corner',
    tagline: 'Scrolled arms · Full or scattered back · Made in the UK',
    sub: 'Scrolled arms, a full or scattered back, made in the UK',
    detailsLine: 'Every cushion included, and made to order in the UK.',
    callouts: [
      { label: 'Scrolled arms', dot: [235, 650], pill: [40, 820] },
      { label: 'Scattered back cushions', dot: [470, 500], pill: [300, 300] },
      { label: 'Soft textured fabric', dot: [690, 615], pill: [600, 830] },
    ],
    optionSubs: { 'verona-corner-set': 'corner, cuddle chair and footstool' },
    altDetail: 'with scrolled arms',
    ...post({
      hook: (d) => `From an armchair to a family set, from ${d.from}. This is Verona.`,
      fbHook: (d) => `Verona: scrolled arms in ${words(d.sizes.length)} sizes, from ${d.from}.`,
      altHook: 'One range, a whole living room: sofas, corners, an armchair and a family set.',
      story: 'Verona pairs scrolled arms with a full back or a scattered back of loose cushions. With straight sofas, two corner layouts, a 5 seater corner, a matching armchair and a family set, you can furnish a whole room in one range.',
      tags: '#cornersofa #greysofa #sofaset #livingroomideas #madeintheuk',
    }),
  },

  // 3 · editorial
  'roma-recliner': {
    short: 'Roma',
    cover: 'roma-recliner-manual-3-2',
    coverColour: 'Black',
    tagline: 'Manual reclining · Leather Aire or fabric · Ready made',
    sub: 'Reclines by hand, in Leather Aire or fabric',
    detailsLine: 'No cables or plugs to find room for.',
    ...post({
      hook: (d) => `Recline by hand, no plugs or cables. Roma starts at ${d.from}.`,
      fbHook: (d) => `Roma Recliner: reclining by hand, from ${d.from}.`,
      altHook: 'No socket near the sofa? Roma reclines by hand.',
      story: 'Roma reclines by hand, so there are no cables or plugs to find room for. It comes in Leather Aire, a soft leather-look fabric, or in grey fabric, as an armchair, a 2 or 3 seater, a 3+2 set or a corner.',
      tags: '#reclinersofa #recliner #reclinerchair #livingroomideas #sofa',
    }),
  },

  // 4 · velvet
  salone: {
    cover: 'salone-armed-u-shape',
    tagline: 'Plush velvet · Chrome feet · Made in the UK',
    sub: 'Seven shapes on polished chrome feet',
    detailsLine: 'Every cushion included, and made to order in the UK.',
    altDetail: 'on polished chrome feet',
    ...post({
      hook: (d) => `${cap(words(d.sizes.length))} shapes, from a 2 seater to an armed U-shape. This is Salone, from ${d.from}.`,
      fbHook: (d) => `Salone: ${words(d.sizes.length)} shapes on polished chrome feet, from ${d.from}.`,
      altHook: 'A corner, a wall or an open-plan room: there’s a Salone for it.',
      story: 'Salone is a modern, low-fuss shape on polished chrome feet. It comes in everything from a 2 seater to an L-shape and two U-shapes, so it can fill a corner, a wall or an open-plan room.',
      tags: '#ushapesofa #cornersofa #velvetsofa #modernsofa #madeintheuk',
    }),
  },

  // 5 · bold
  sims: {
    cover: 'sims-high-back-5-seater-corner',
    tagline: 'Channel-stitched arms · High or scattered back · Made in the UK',
    sub: 'Channel-stitched arms, a high or scattered back',
    detailsLine: 'Every cushion included, and made to order in the UK.',
    callouts: [
      { label: 'Channel-stitched arms', dot: [110, 660], pill: [40, 830] },
      { label: 'Fixed high back', dot: [560, 460], pill: [420, 300] },
      { label: 'Plush velvet', dot: [750, 640], pill: [640, 830] },
    ],
    altDetail: 'with channel-stitched arms',
    ...post({
      hook: (d) => `Channel-stitched arms, from a 3+2 set to an armed U-shape. This is Sims, from ${d.from}.`,
      fbHook: (d) => `Sims: channel-stitched arms in ${words(d.sizes.length)} sizes, from ${d.from}.`,
      altHook: 'Clean, squared and modern, with a stitch down every arm.',
      story: 'Sims has stitched channels running down the front of each arm and a clean, squared shape that suits a modern room. It comes as a high back with fixed cushions or a scattered back with loose ones, from the 3+2 set up to a full U-shape.',
      tags: '#cornersofa #velvetsofa #ushapesofa #modernsofa #madeintheuk',
    }),
  },

  // 6 · editorial
  'nova-electric-recliner': {
    short: 'Nova',
    cover: 'nova-electric-recliner-corner',
    tagline: 'Electric reclining · Tech leather · USB and cup holders',
    sub: 'Electric reclining in tech leather that wipes clean',
    detailsLine: 'USB ports, cup holders and storage built in.',
    ...post({
      hook: (d) => `Recline at the touch of a button, with USB ports and cup holders built in. Nova starts at ${d.from}.`,
      fbHook: (d) => `Nova Electric Recliner: tech leather, from ${d.from}.`,
      altHook: 'Film night, sorted: Nova reclines at a touch and wipes clean.',
      story: 'Nova reclines electrically and is upholstered in tech leather, which looks and feels like leather and wipes clean. Cup holders, USB ports and storage are built in.',
      tags: '#electricrecliner #reclinersofa #recliner #cornersofa #livingroomideas',
    }),
  },

  // 7 · velvet
  malibu: {
    cover: 'malibu-high-back-3-seater',
    tagline: 'High back · Natural colours · Made in the UK',
    sub: 'A high back and calm, natural colours',
    detailsLine: 'Every cushion included, and made to order in the UK.',
    // The oatmeal corner photo has a buttoned footstool in front; no Malibu footstool is sold.
    photoNotes: { 'malibu-high-back-5-seater-corner|Oatmeal': 'Footstool not included' },
    ...post({
      hook: (d) => `A high back and calm, natural colours. Malibu starts at ${d.from}.`,
      fbHook: (d) => `Malibu: a high back and natural colours, from ${d.from}.`,
      altHook: 'Colours that sit easily with wood and stone.',
      story: 'Malibu keeps things simple: a high back, clean lines and calm, natural colours such as oatmeal and pebble that sit easily with wood and stone.',
      tags: '#neutralhome #cornersofa #sofa #livingroomideas #madeintheuk',
    }),
  },

  // 8 · bold
  lily: {
    cover: 'lily-5-seater-corner',
    tagline: 'Round bolsters · Plump cushions · Made in the UK',
    sub: 'Round bolsters and plump cushions',
    detailsLine: 'A sofa for sinking into, made to order in the UK.',
    callouts: [
      { label: 'Round bolsters', dot: [875, 610], pill: [640, 820] },
      { label: 'Pleated arm panels', dot: [100, 640], pill: [40, 880] },
      { label: 'Plump back cushions', dot: [440, 500], pill: [330, 300] },
    ],
    ...post({
      hook: (d) => `Round bolsters and plump cushions, made for sinking into. This is Lily, from ${d.from}.`,
      fbHook: (d) => `Lily: round bolsters and plump cushions, from ${d.from}.`,
      altHook: 'The sofa for the end of the day.',
      story: 'Lily is soft and generous, with plump back cushions, round bolsters at each arm and pleated arm panels. It is a sofa for sinking into at the end of the day.',
      tags: '#cosyhome #cornersofa #sofa #livingroomideas #madeintheuk',
    }),
  },

  // 9 · editorial
  'michigan-electric-recliner': {
    short: 'Michigan',
    cover: 'michigan-electric-recliner-corner',
    coverColour: 'Grey',
    tagline: 'Electric reclining · LED lights · Speakers and wireless charging',
    sub: 'Electric reclining, LED lights and Bluetooth speakers',
    detailsLine: 'Adjustable headrests, USB and USB-C, and a storage console.',
    ...post({
      hook: (d) => `LED lights, speakers and wireless charging, in a sofa that reclines. Michigan starts at ${d.from}.`,
      fbHook: (d) => `Michigan Electric Recliner: made for film nights, from ${d.from}.`,
      altHook: 'A sofa made for film nights.',
      story: 'Michigan reclines electrically, with adjustable headrests, LED lighting along the base, Bluetooth speakers, wireless charging and a drop-down console with cup holders. Tech air leather wipes clean.',
      tags: '#electricrecliner #cinemaroom #reclinersofa #movienight #livingroomideas',
    }),
  },

  // 10 · velvet
  'hannah-electric': {
    short: 'Hannah',
    cover: 'hannah-electric-3-2-seater',
    tagline: 'Electric reclining · USB and cup holders · Soft micro fabric',
    sub: 'Electric reclining in soft micro fabric',
    detailsLine: 'Cup holders and USB ports, all within reach.',
    ...post({
      hook: (d) => `Electric reclining, cup holders and USB ports, in soft micro fabric. Hannah, from ${d.from}.`,
      fbHook: (d) => `Hannah Electric: reclining at a touch, from ${d.from}.`,
      altHook: 'Everything within reach.',
      story: 'Hannah reclines at the touch of a button, in a soft micro fabric. Cup holders and USB ports are built in, so everything you need is within reach.',
      tags: '#electricrecliner #reclinersofa #cornersofa #livingroomideas #sofa',
    }),
  },

  // 11 · bold
  'rio-chesterfield': {
    short: 'Rio',
    cover: 'rio-chesterfield-5-seater-corner',
    tagline: 'Chesterfield arms · Deep buttoning · Made in the UK',
    sub: 'Chesterfield scroll arms and deep buttoning',
    detailsLine: 'Foam seats, fibre-filled backs, and made to order in the UK.',
    callouts: [
      { label: 'Chesterfield scroll arms', dot: [150, 650], pill: [40, 830] },
      { label: 'Deep buttoning', dot: [300, 740], pill: [440, 880] },
      { label: 'Dark wooden feet', dot: [985, 785], pill: [740, 820] },
    ],
    altDetail: 'with Chesterfield scroll arms',
    ...post({
      hook: (d) => `The classic Chesterfield, in soft fabric, from ${d.from}. This is Rio.`,
      fbHook: (d) => `Rio Chesterfield: deep buttoning and scroll arms, from ${d.from}.`,
      altHook: 'Chesterfield looks, fabric comfort.',
      story: 'Rio Chesterfield brings the classic Chesterfield scroll arm and deep buttoning to a fabric sofa, standing on dark wooden feet.',
      tags: '#chesterfieldsofa #chesterfield #cornersofa #greysofa #madeintheuk',
    }),
  },

  // 12 · editorial
  harrison: {
    cover: 'harrison-scattered-back-5-seater-corner',
    tagline: 'Stud-trimmed arms · Foam seats · Made in the UK',
    sub: 'A 5 seater corner with stud-trimmed curved arms',
    detailsLine: 'Made to order in the UK.',
    ...post({
      hook: (d) => `A 5 seater corner with stud-trimmed curved arms, for ${d.from}. This is Harrison.`,
      fbHook: (d) => `Harrison: a 5 seater corner for ${d.from}.`,
      altHook: 'Room for everyone, with studs on the arms.',
      story: 'Harrison is a 5 seater corner with curved arms trimmed in studs, foam seat cushions that keep their shape and fibre-filled back cushions you can sink into.',
      tags: '#cornersofa #greysofa #sofa #livingroomideas #madeintheuk',
    }),
  },

  // 13 · velvet
  oakland: {
    cover: 'oakland-scattered-back-5-seater-corner',
    tagline: 'Faux leather · Rolled arms with studs · Made in the UK',
    sub: 'Faux leather with rolled, stud-trimmed arms',
    detailsLine: 'Foam seats, fibre-filled backs, and made to order in the UK.',
    ...post({
      hook: (d) => `Faux leather, rolled arms and studs: Oakland is a 5 seater corner for ${d.from}.`,
      fbHook: (d) => `Oakland: a faux leather 5 seater corner for ${d.from}.`,
      altHook: 'Tan faux leather that wipes clean.',
      story: 'Oakland is a 5 seater corner in faux leather, with rolled arms finished in studs and dark wooden feet. The seat cushions are foam filled and the back cushions fibre filled.',
      tags: '#fauxleathersofa #cornersofa #tansofa #livingroomideas #madeintheuk',
    }),
  },

  // 14 · bold
  olympia: {
    cover: 'olympia-scattered-back-5-seater-corner',
    tagline: 'Navy velvet · Deep-buttoned scroll arms · Chrome feet',
    sub: 'Deep-buttoned scroll arms on chrome feet',
    detailsLine: 'Foam seats, fibre-filled backs, and made to order in the UK.',
    callouts: [
      { label: 'Deep-buttoned scroll arms', dot: [85, 568], pill: [40, 760] },
      { label: 'Chrome feet', dot: [199, 736], pill: [260, 840] },
      { label: 'Plush velvet', dot: [313, 497], pill: [300, 300] },
    ],
    ...post({
      hook: (d) => `Navy velvet, deep-buttoned scroll arms and chrome feet. Olympia is a 5 seater corner for ${d.from}.`,
      fbHook: (d) => `Olympia: a navy velvet 5 seater corner for ${d.from}.`,
      altHook: 'A classic shape with a bright finish.',
      story: 'Olympia is a 5 seater corner with deep-buttoned scroll arms on chrome feet: a classic shape with a bright finish. Foam seat cushions keep their shape and the fibre-filled back cushions stay soft.',
      tags: '#velvetsofa #navysofa #cornersofa #livingroomideas #madeintheuk',
    }),
  },

  // 15 · editorial
  ruby: {
    cover: 'ruby-scattered-back-5-seater-corner',
    tagline: 'Chrome stud trim · Chrome feet · Made in the UK',
    sub: 'Square arms edged in chrome studs',
    detailsLine: 'Made to order in the UK.',
    ...post({
      hook: (d) => `Square arms edged in chrome studs. Ruby is a 5 seater corner for ${d.from}.`,
      fbHook: (d) => `Ruby: a 5 seater corner for ${d.from}.`,
      altHook: 'Crisp, modern and comfortable every day.',
      story: 'Ruby is a 5 seater corner with square arms edged in chrome studs and chrome feet: crisp and modern. Foam seat cushions and fibre-filled back cushions make it comfortable for every day.',
      tags: '#cornersofa #charcoalsofa #modernsofa #livingroomideas #madeintheuk',
    }),
  },

  // 16 · velvet
  shannon: {
    cover: 'shannon-scattered-back-5-seater-corner',
    tagline: 'Faux leather arms · Fabric seats · Chrome feet',
    sub: 'Faux leather arms and fabric seats',
    detailsLine: 'Made to order in the UK.',
    ...post({
      hook: (d) => `Faux leather where hands rest, soft fabric where you sit. Shannon is a 5 seater corner for ${d.from}.`,
      fbHook: (d) => `Shannon: a 5 seater corner for ${d.from}.`,
      altHook: 'Each material where it works hardest.',
      story: 'Shannon is a 5 seater corner that mixes fabric seats with faux leather arms, on chrome feet. The faux leather takes the wear where hands rest most.',
      tags: '#cornersofa #greysofa #sofa #livingroomideas #madeintheuk',
    }),
  },

  // 17 · bold
  tango: {
    cover: 'tango-scattered-back-5-seater-corner',
    tagline: 'Scrolled faux leather arms · Two-tone · Made in the UK',
    sub: 'Scrolled faux leather arms in a two-tone finish',
    detailsLine: 'Foam seats, fibre-filled backs, and made to order in the UK.',
    callouts: [
      { label: 'Scrolled faux leather arms', dot: [135, 568], pill: [40, 760] },
      { label: 'Two-tone finish', dot: [355, 625], pill: [330, 840] },
      { label: 'Fibre-filled backs', dot: [469, 469], pill: [420, 300] },
    ],
    ...post({
      hook: (d) => `Two-tone and easy to live with: Tango is a 5 seater corner for ${d.from}.`,
      fbHook: (d) => `Tango: a two-tone 5 seater corner for ${d.from}.`,
      altHook: 'Scrolled arms, two tones, room for five.',
      story: 'Tango is a 5 seater corner with scrolled faux leather arms and fabric seats, in a two-tone finish that is easy to live with.',
      tags: '#cornersofa #greysofa #sofa #livingroomideas #madeintheuk',
    }),
  },

  // 18 · editorial
  windsor: {
    cover: 'windsor-scattered-back-5-seater-corner',
    tagline: 'Chesterfield arms · Cream chenille · Made in the UK',
    sub: 'Deep-buttoned Chesterfield arms, in cream',
    detailsLine: 'Foam seats, fibre-filled backs, and made to order in the UK.',
    ...post({
      hook: (d) => `Deep-buttoned Chesterfield arms, in cream. Windsor is a 5 seater corner for ${d.from}.`,
      fbHook: (d) => `Windsor: a cream 5 seater corner for ${d.from}.`,
      altHook: 'Traditional in shape, light and fresh in colour.',
      story: 'Windsor is a 5 seater corner with deep-buttoned Chesterfield scroll arms on dark wooden feet: traditional in shape, light and fresh in cream.',
      tags: '#chesterfieldsofa #creamsofa #cornersofa #livingroomideas #madeintheuk',
    }),
  },
}

// The close-ups are the site's own (the product page's gallery and the feeds use them too).
for (const [slug, details] of Object.entries(CLOSE_UPS)) if (COPY[slug]) COPY[slug].details = details
