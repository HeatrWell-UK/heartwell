// The words for each range's post that aren't data: the cover photo and the
// line under the name in its alcove, a detail for alt text, and the captions.
// Sizes, prices, fabric counts and the link are filled in from the live shop
// by build.mjs, so a caption never states a stale price.
//
// Voice (docs/DESIGN.md): plain and specific, British, warm, never pushy. No
// urgency, no was-prices, no claims the site doesn't make. One call to action.
// Instagram links aren't clickable, so it says "the link in our bio";
// Facebook gets the range page's link, tagged so the admin sees where visits came from.
//
// alcove: where the name and tagline sit in the cover photo, in px on the
// 1080 px photo (the centre of each line), measured by eye per photo.

const WHATSAPP = '07460 669864'
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const words = (n) => NUMBERS[n] ?? String(n)
const list = (sizes) => sizes.map((s) => `${s.label} from ${s.money}`).join('\n')
const withMoney = (d) => d.sizes.map((s) => ({ ...s, money: d.money(s.from) }))

export const COPY = {
  ashton: {
    cover: 'ashton-high-back-u-shape',
    tagline: 'Plush velvet, made in the UK',
    alcove: { nameY: 245, nameSize: 150, taglineY: 380 },
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
        `Made to order in the UK, in the grey shown or any of our ${d.fabrics} fabrics${d.samePrice ? ', all at the same price' : ''}.`,
        '',
        'Free delivery to most of mainland Britain, and nothing to pay until it’s in your room: cash or bank transfer to the driver.',
        '',
        `Order through the link in our bio, or message us on WhatsApp: ${WHATSAPP}.`,
        '',
        '#velvetsofa #cornersofa #ushapesofa #greysofa #madeintheuk',
      ].join('\n'),
    instagramAlt: (d) => {
      const s = withMoney(d)
      return [
        'A U-shape sofa, and nothing to pay until it’s in your room.',
        '',
        'That’s how every Ashton works: choose it, confirm your order, and pay the driver in cash or by bank transfer once it’s home. Delivery is free to most of mainland Britain.',
        '',
        `Ashton is plush velvet with deep-buttoned arms and polished chrome feet, made to order in the UK. ${sentenceCase(words(s.length))} sizes, from the ${s[0].label.toLowerCase()} at ${s[0].money} to the ${s.at(-1).label} at ${s.at(-1).money}, each with a high back or a scattered back. Swipe for every size and price.`,
        '',
        `Order through the link in our bio, or message us on WhatsApp: ${WHATSAPP}.`,
        '',
        '#velvetsofa #ushapesofa #cornersofa #greysofa #madeintheuk',
      ].join('\n')
    },
    facebook: (d) =>
      [
        `Ashton: deep-buttoned velvet in ${words(d.sizes.length)} sizes, from ${d.from}.`,
        '',
        `Plush velvet with a soft sheen and polished chrome feet, made to order in the UK in grey or any of our ${d.fabrics} fabrics${d.samePrice ? ', at the same price' : ''}. Every size comes with a high back or a scattered back:`,
        '',
        list(withMoney(d)),
        '',
        'Free delivery to most of mainland Britain, and nothing to pay until it’s in your room.',
        '',
        `See every size and measurement: ${d.link}`,
        `Or message us on WhatsApp: ${WHATSAPP}`,
      ].join('\n'),
  },
}

function sentenceCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
