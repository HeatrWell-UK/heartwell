// Plain answers to the questions shoppers ask (and type into Google or an AI
// assistant), written from the shop's own data: a product's measurements,
// cover and colours, a range's sizes and prices, the delivery areas and the
// policies. Pure, so tested; every figure comes from a single source, so an
// answer can't disagree with the page or checkout.

import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import { POLICIES, PROMISES } from '@/config/promises'
import type { FaqItem } from '@/content/faq'
import type { RangeSummary } from '@/lib/catalogue/listing'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { sizeLabel } from '@/lib/catalogue/range-sizes'
import { deliveryDaysText } from '@/lib/delivery/window'
import { formatPrice } from '@/lib/format'
import { measurementLayout, type Layout } from '@/lib/product/measurements'
import type { DeliveryInfo, ProductPageData } from '@/lib/product/types'

export type Answer = FaqItem

export interface AnswerFacts {
  delivery: DeliveryInfo | null
  /** Fabrics in the library, for made-to-order pieces. */
  fabricCount: number
}

const andList = new Intl.ListFormat('en-GB', { type: 'conjunction' })
const orList = new Intl.ListFormat('en-GB', { type: 'disjunction' })
const cm = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} cm`
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Plush Velvet" -> "plush velvet"; Leather Aire keeps its capitals (it's a name). */
export function materialWords(label: string): string {
  return label
    .split(/(\bLeather Aire\b)/i)
    .map((part) => (/^leather aire$/i.test(part) ? 'Leather Aire' : part.toLowerCase()))
    .join('')
}

const LEATHER_LOOK = /tech leather|leather aire|faux leather|leather-look/i

// Delivery ----------------------------------------------------------------------

/** "Aberdeen area" -> "the Aberdeen area", "Far north of Scotland" -> "the far north of Scotland"; place names stay as they are. */
export function areaInSentence(name: string): string {
  if (/^far\b/i.test(name)) return `the ${name.charAt(0).toLowerCase()}${name.slice(1)}`
  if (/\barea$/i.test(name) || /^scottish\b/i.test(name)) return `the ${name}`
  return name
}

/** "A, B and C", with a comma before the last "and" when a name has its own "and" ("the Scottish Highlands and Moray"). */
function namesList(names: string[]): string {
  if (names.length < 3 || !names.some((n) => / and /.test(n))) return andList.format(names)
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
}

/** Free most places in 2 to 4 working days, the charged areas with their prices and time, and the days we deliver. */
export function deliveryAnswer(delivery: DeliveryInfo | null): string {
  if (!delivery) return `${PROMISES.delivery.long} ${PROMISES.delivery.timingLong}`
  const parts = [`Delivery is free to most of mainland Britain and takes ${delivery.minDays} to ${delivery.maxDays} working days.`]
  if (delivery.areas.length) {
    const charges = [...new Set(delivery.areas.map((a) => a.charge))].sort((x, y) => x - y)
    const groups = charges.map((c) => `${formatPrice(c)} to ${namesList(delivery.areas.filter((a) => a.charge === c).map((a) => areaInSentence(a.name)))}`)
    parts.push(`A few areas pay a delivery charge and take ${PROMISES.delivery.chargedTiming}: ${groups.join('; ')}.`)
  }
  parts.push(deliveryDaysText(delivery.noDeliveryDays))
  return parts.join(' ')
}

export const PAYING_ANSWER =
  'Nothing until it arrives: you pay the driver in cash or by bank transfer once your sofa is in your room. There’s no deposit and no card details to give. Once you order, we send you a link, and your order goes ahead when you tap Confirm.'

/** "Can I see it first?": the showroom by appointment, and samples by post for made-to-order pieces. Null without an address. */
export function showroomAnswer(subject: string, withSamples: boolean): string | null {
  const a = CONTACT.visitAddress
  if (!a) return null
  return `You’re welcome at our showroom at ${a.street}, ${a.locality} ${a.postcode}: ${visitHoursText()}. ${visitBookingText()} Tell us you’d like to see ${subject} when you book, and we’ll tell you what we can show you.${withSamples ? ' You can also order fabric samples by post.' : ''}`
}

// Products ------------------------------------------------------------------------

/** Its measurements in a sentence, read the same way as the drawing on its page. Null when they aren't known. */
export function sizeAnswer(p: Pick<ProductPageData, 'title' | 'shape' | 'dimensions' | 'pieces' | 'dimensionsNote'>): string | null {
  const layout = measurementLayout(p.shape, p.dimensions, p.pieces)
  const { depth_cm: d, height_cm: h } = p.dimensions
  const depthHeight = [d ? `${cm(d)} deep` : null, h ? `${cm(h)} high` : null].filter(Boolean) as string[]
  let text: string | null = null
  if (layout?.kind === 'corner') {
    const sides = layout.top === layout.left ? `${cm(layout.top)} along each side` : `${cm(layout.top)} along one side and ${cm(layout.left)} along the other`
    text = `The ${p.title} measures ${sides}${depthHeight.length ? `, and it’s ${andList.format(depthHeight)}` : ''}.`
  } else if (layout?.kind === 'u') {
    const sides = layout.left === layout.right ? `two sides of ${cm(layout.left)}` : `sides of ${cm(layout.left)} and ${cm(layout.right)}`
    text = `The ${p.title} is ${cm(layout.back)} across the back, with ${sides}${depthHeight.length ? `; it’s ${andList.format(depthHeight)}` : ''}.`
  } else if (layout?.kind === 'set') {
    const pieces = p.pieces
      .filter((piece) => piece.width_cm)
      .map((piece) => {
        const rest = [piece.depth_cm ? `${cm(piece.depth_cm)} deep` : null, piece.height_cm ? `${cm(piece.height_cm)} high` : null].filter(Boolean)
        return `the ${piece.label.toLowerCase()} is ${andList.format([`${cm(piece.width_cm!)} wide`, ...(rest as string[])])}`
      })
    text = `${sentence(pieces.join('; '))}.`
  } else if (layout?.kind === 'straight') {
    text = `It’s ${andList.format([`${cm(layout.w)} wide`, ...depthHeight])}.`
  } else if (depthHeight.length) {
    text = `It’s ${andList.format(depthHeight)}.`
  }
  if (!text) return null
  return p.dimensionsNote ? `${text} ${p.dimensionsNote.trim()}` : text
}

/** What it's covered in and the colours it comes in, plain about leather-look covers. */
export function coverAnswer(p: Pick<ProductPageData, 'variants' | 'specs' | 'madeToOrder' | 'madeInUk'>, fabricCount: number): string {
  const specMaterial = p.specs.find((r) => r.label === 'Material')?.value ?? null
  const pairs = p.variants
    .filter((v) => v.colourName)
    .map((v) => ({ colour: v.colourName!.toLowerCase(), material: v.materialLabel ?? specMaterial }))
  const materials = [...new Set(pairs.map((x) => x.material).filter((m): m is string => Boolean(m)))]
  const parts: string[] = []
  if (pairs.length && materials.length <= 1) {
    const colours = orList.format([...new Set(pairs.map((x) => x.colour))])
    parts.push(materials[0] ? `It’s covered in ${materialWords(materials[0])}, in ${colours}.` : `It comes in ${colours}.`)
  } else if (pairs.length) {
    // Grouped by cover: "grey, black or beige plush velvet, or silver fabric".
    const groups = materials.map((m) => `${orList.format([...new Set(pairs.filter((x) => x.material === m).map((x) => x.colour))])} ${materialWords(m)}`)
    parts.push(`It comes in ${groups.join(', or ')}.`)
  } else if (specMaterial) {
    parts.push(`It’s covered in ${materialWords(specMaterial)}.`)
  }
  const all = [...materials, specMaterial ?? ''].join(' ')
  if (LEATHER_LOOK.test(all)) parts.push('These are leather-look covers, not real leather: they look like leather and wipe clean.')
  if (p.madeToOrder) parts.push(`It’s made to order${p.madeInUk ? ' in the UK' : ''}, so you can also have it in any of our ${fabricCount > 0 ? `${fabricCount} ` : ''}fabrics.`)
  return parts.join(' ')
}

/** "Will it fit through my door?": the smaller of depth and height is what has to pass, as the door check on the page says. */
export function fitAnswer(p: Pick<ProductPageData, 'shape' | 'dimensions'>, noun: string): string {
  const sides = [p.dimensions.depth_cm, p.dimensions.height_cm].filter((n): n is number => typeof n === 'number' && n > 0)
  const parts: string[] = []
  if (sides.length) {
    const needed = Math.min(...sides)
    parts.push(
      `Sofas go through a door on their side, so compare the smaller of its depth and height (${cm(needed)}) with your narrowest door or hallway. The door check on this page does it for you, and if it’s tight, ask us: we’ll tell you how it can go in.`,
    )
  } else {
    parts.push('Measure the narrowest door or hallway on the way in, and ask us: we’ll check it against this piece for you.')
  }
  if (p.shape === 'corner' || p.shape === 'u-shape') parts.push(`The ${noun} arrives in sections that go together in your room, so each part only has to get through on its own.`)
  if (p.shape === 'set') parts.push('It comes as two separate sofas, so each one only has to get through on its own.')
  parts.push('Check stairs and turns too.')
  return parts.join(' ')
}

export function returnsAnswer(madeToOrder: boolean): string {
  return madeToOrder
    ? `Because it’s made to order for you, the ${POLICIES.changeOfMindDays}-day change-of-mind right doesn’t apply. You can change or cancel it within ${POLICIES.madeToOrderChangeWorkingDays} working days of ordering, before it’s made, and faults are always covered.`
    : `Yes. You have ${POLICIES.changeOfMindDays} days from delivery to change your mind; you pay for the return, and we refund you within ${POLICIES.refundDays} days of it coming back. Faults are always covered.`
}

/** The questions on a product's page, each answered from its own details. */
export function productQuestions(p: ProductPageData, facts: AnswerFacts): Answer[] {
  const noun = p.typeName.toLowerCase()
  const size = sizeAnswer(p)
  const d = facts.delivery
  const items: (Answer | null)[] = [
    size ? { id: 'size', q: `How big is the ${p.title}?`, a: size, link: { href: '/will-it-fit', label: 'How to measure your room and doors' } } : null,
    { id: 'cover', q: `What is it covered in, and what colours does it come in?`, a: coverAnswer(p, facts.fabricCount), ...(p.madeToOrder ? { link: { href: '/fabrics', label: 'See every fabric' } } : {}) },
    { id: 'delivery', q: 'How long does delivery take, and what does it cost?', a: `${deliveryAnswer(d)} Enter your postcode above to see your own dates.`, link: { href: '/delivery-and-returns', label: 'Delivery and returns' } },
    { id: 'pay', q: 'When do I pay?', a: PAYING_ANSWER, link: { href: '/guides/how-paying-on-delivery-works', label: 'How paying on delivery works' } },
    { id: 'fit', q: `Will the ${noun} fit through my door?`, a: fitAnswer(p, noun) },
    { id: 'returns', q: 'Can I return it if I change my mind?', a: returnsAnswer(p.madeToOrder) },
    d
      ? {
          id: 'extras',
          q: 'Can you carry it upstairs, put it together or take my old sofa away?',
          a: `Yes, add any of them at checkout: upstairs ${formatPrice(d.upstairsFirstFloor)} for the first floor (or any floor with a lift) and ${formatPrice(d.upstairsPerExtraFloor)} for each floor above; assembly ${formatPrice(d.assemblyFee)}; taking your old sofa away ${formatPrice(d.removalPerSeat)} a seat.`,
        }
      : null,
  ]
  return items.filter((i): i is Answer => i !== null)
}

// Ranges ----------------------------------------------------------------------------

/** A piece's size as people compare it: "245 × 190 cm, 90 cm deep, 95 cm high". */
export function listingSize(p: Pick<ListingProduct, 'plan' | 'depthCm' | 'heightCm'>): string | null {
  const plan: Layout | null = p.plan
  if (!plan) return null
  const across =
    plan.kind === 'straight'
      ? `${cm(plan.w)} wide`
      : plan.kind === 'corner'
        ? `${plan.top} × ${cm(plan.left)}`
        : plan.kind === 'u'
          ? `${cm(plan.back)} across, sides ${plan.left === plan.right ? cm(plan.left) : `${plan.left} and ${cm(plan.right)}`}`
          : `${plan.pieces.map((x) => cm(x.w)).join(' and ')} wide`
  const rest = [p.depthCm ? `${cm(p.depthCm)} deep` : null, p.heightCm ? `${cm(p.heightCm)} high` : null].filter(Boolean)
  return [across, ...(rest as string[])].join(', ')
}

/**
 * One line per size, across its back styles: "4 seater corner: 240 × 190 cm,
 * 90 to 95 cm deep (depending on the back), 90 cm high".
 */
export function rangeSizeLines(pieces: ListingProduct[]): string[] {
  const groups = new Map<string, ListingProduct[]>()
  for (const p of [...pieces].sort((a, b) => a.sort - b.sort)) groups.set(p.axis1Value ?? p.slug, [...(groups.get(p.axis1Value ?? p.slug) ?? []), p])
  const spread = (values: (number | null)[], word: string) => {
    const known = [...new Set(values.filter((n): n is number => typeof n === 'number' && n > 0))].sort((a, b) => a - b)
    if (known.length === 0) return null
    return known.length === 1 ? `${cm(known[0]!)} ${word}` : `${known[0]} to ${cm(known.at(-1)!)} ${word} (depending on the back)`
  }
  return [...groups.values()].flatMap((group) => {
    const first = group.find((p) => p.plan) ?? group[0]!
    const across = listingSize({ plan: first.plan, depthCm: null, heightCm: null })
    if (!across) return []
    const parts = [across, spread(group.map((p) => p.depthCm), 'deep'), spread(group.map((p) => p.heightCm), 'high')].filter(Boolean)
    return [`${first.axis1Value ? sizeLabel(first.axis1Value) : first.title}: ${parts.join(', ')}`]
  })
}

const STYLE_NOTE: Record<string, string> = {
  'high back': 'a high back has fixed back cushions, for a tailored look and support for your head',
  'scattered back': 'a scattered back (also called a scatter back) has loose back cushions you can plump and move, for a softer, more relaxed look',
}

/** The questions on a range's page, from its pieces. */
export function rangeQuestions(range: RangeSummary, facts: AnswerFacts): Answer[] {
  const pieces = [...range.products].sort((a, b) => a.sort - b.sort)
  const sizes = [...new Set(pieces.map((p) => (p.axis1Value ? sizeLabel(p.axis1Value).toLowerCase() : p.title)))]
  const prices = pieces.map((p) => p.price)
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const styles = [...new Set(pieces.map((p) => p.axis2Value?.toLowerCase()).filter((s): s is string => Boolean(s)))]
  const materials = [...new Set(pieces.map((p) => p.material).filter((m): m is string => Boolean(m)))]
  const colours = [...new Set(range.colours.map((c) => c.name.toLowerCase()))]
  const madeInUk = pieces.every((p) => p.madeInUk)
  const allMade = pieces.every((p) => p.madeToOrder)
  const noneMade = pieces.every((p) => !p.madeToOrder)
  // Whether every size comes in every back style, as the range page says it.
  const stylesBySize = new Map<string, Set<string>>()
  for (const p of pieces) if (p.axis2Value) stylesBySize.set(p.axis1Value ?? p.slug, new Set([...(stylesBySize.get(p.axis1Value ?? p.slug) ?? []), p.axis2Value.toLowerCase()]))
  const everySizeEveryStyle = [...stylesBySize.values()].every((set) => set.size === styles.length) && stylesBySize.size === sizes.length
  const measured = pieces.map((p) => ({ p, size: listingSize(p) })).filter((x): x is { p: ListingProduct; size: string } => Boolean(x.size))
  const reclining = [...new Set(pieces.map((p) => p.reclining).filter((r): r is string => Boolean(r)))]
  const a = CONTACT.visitAddress

  const items: (Answer | null)[] = [
    {
      id: 'sizes',
      q: `What sizes does the ${range.name} range come in?`,
      a: `${sentence(andList.format(sizes))}${styles.length > 1 ? (everySizeEveryStyle ? `, each with a ${orList.format(styles)}` : `, some with a choice of ${orList.format(styles)}`) : ''}. Prices start at ${formatPrice(low)}${high > low ? ` and go up to ${formatPrice(high)}` : ''}.`,
    },
    measured.length
      ? {
          id: 'dimensions',
          q: `What are the ${range.name} dimensions?`,
          a: `${rangeSizeLines(pieces).join('. ')}. Every size is drawn to scale on its page, with the full measurements.`,
          link: { href: '/will-it-fit', label: 'How to measure your room and doors' },
        }
      : null,
    colours.length
      ? {
          id: 'colours',
          q: `What colours does ${range.name} come in?`,
          a: `In ${orList.format(colours)}${materials.length === 1 ? ` ${materialWords(materials[0]!)}` : materials.length > 1 ? `, in ${orList.format(materials.map(materialWords))}` : ''}.${range.madeToOrder ? ` It’s made to order, so you can also have it in any of our ${facts.fabricCount > 0 ? `${facts.fabricCount} ` : ''}fabrics.` : ''}${LEATHER_LOOK.test(materials.join(' ')) ? ' The leather-look covers aren’t real leather: they look like it and wipe clean.' : ''}`,
          ...(range.madeToOrder ? { link: { href: '/fabrics', label: 'See every fabric' } } : {}),
        }
      : null,
    styles.length > 1 && styles.every((s) => STYLE_NOTE[s])
      ? {
          id: 'styles',
          q: `What’s the difference between the ${andList.format(styles)} ${range.name}?`,
          a: `${styles.map((s) => `${sentence(STYLE_NOTE[s]!)}.`).join(' ')} The sizes are the same, so it comes down to the look and how you like to sit; check each page for its exact depth.`,
          link: { href: '/guides/high-back-or-scatter-back-sofa', label: 'High back or scatter back?' },
        }
      : null,
    reclining.length
      ? {
          id: 'reclining',
          q: `Is the ${range.name} electric or manual?`,
          a:
            reclining.length === 1 && /electric/i.test(reclining[0]!)
              ? 'Electric: it reclines at the touch of a button and stops wherever you like. It plugs into an ordinary socket, so plan for one nearby.'
              : reclining.length === 1
                ? 'Manual: you recline it by hand, so there are no cables or plugs to find room for.'
                : `It comes in ${orList.format(reclining.map((r) => r.toLowerCase()))} versions.`,
          link: { href: '/guides/electric-or-manual-recliner', label: 'Electric or manual recliner?' },
        }
      : null,
    {
      id: 'made',
      q: `Is the ${range.name} made to order?`,
      a: allMade
        ? `Yes, it’s made${madeInUk ? ' in the UK' : ''} in the colour you choose, and still arrives in the usual delivery time. ${returnsAnswer(true)}`
        : noneMade
          ? `No, it’s ready-made, in the colours shown. ${returnsAnswer(false)}`
          : 'Some sizes are made to order and some are ready-made: each size’s page says which, and what that means for returns.',
      ...(range.madeToOrder ? { link: { href: '/guides/what-made-to-order-means', label: 'What made to order means' } } : {}),
    },
    { id: 'delivery', q: `How long does the ${range.name} take to arrive?`, a: deliveryAnswer(facts.delivery), link: { href: '/delivery-and-returns', label: 'Delivery and returns' } },
    { id: 'pay', q: 'How do I pay?', a: PAYING_ANSWER, link: { href: '/guides/how-paying-on-delivery-works', label: 'How paying on delivery works' } },
    a ? { id: 'see', q: `Can I see the ${range.name} before I buy?`, a: showroomAnswer(range.name, range.madeToOrder)!, link: { href: '/visit-us', label: 'Visit us' } } : null,
  ]
  return items.filter((i): i is Answer => i !== null)
}

// Structured data ---------------------------------------------------------------------

/** FAQPage data for the questions shown on a page (only ever the ones on screen). */
export function faqJsonLd(items: Answer[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  }
}
