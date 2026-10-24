// Questions and guides for each category page, aimed at what people search for
// (docs/KEYWORDS.md): prices, delivery speed, paying on delivery, fit, and the
// choice the category is about. Answers quote the live catalogue and the
// delivery settings, so they stay true as prices and pieces change.

import { CARE } from '@/config/care'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { formatPrice } from '@/lib/format'
import type { DeliveryInfo } from '@/lib/product/types'
import { deliveryAnswer, listingSize, PAYING_ANSWER, showroomAnswer, type Answer } from '@/lib/seo/answers'

export interface CategoryFacts {
  products: ListingProduct[]
  delivery: DeliveryInfo | null
  fabricCount: number
  /** Sub-categories with pieces of their own (on a department page). */
  children: { name: string; href: string; count: number; from: number }[]
}

export interface CategoryContent {
  questions: (f: CategoryFacts) => (Answer | null)[]
  /** Guides that answer the bigger questions behind this category. */
  guides: { href: string; label: string }[]
}

const andList = new Intl.ListFormat('en-GB', { type: 'conjunction' })

const cheapest = (products: ListingProduct[]) => [...products].sort((a, b) => a.price - b.price)[0] ?? null
const dearest = (products: ListingProduct[]) => [...products].sort((a, b) => b.price - a.price)[0] ?? null
const rangeNames = (products: ListingProduct[]) => [...new Set(products.map((p) => p.rangeName).filter((n): n is string => Boolean(n)))]

/** "Our corner sofas start at £479 (the Verona 4 Seater Corner) and go up to £1,099." */
function priceAnswer(noun: string, products: ListingProduct[]): string | null {
  const low = cheapest(products)
  const high = dearest(products)
  if (!low || !high) return null
  return `We have ${products.length} ${noun}. They start at ${formatPrice(low.price)} (the ${low.title})${high.price > low.price ? ` and go up to ${formatPrice(high.price)}` : ''}, with free delivery to most of mainland Britain and nothing to pay until it arrives.`
}

const deliveryQuestion = (noun: string, f: CategoryFacts): Answer => ({
  id: 'delivery',
  q: `How quickly can I get ${noun} delivered?`,
  a: `${deliveryAnswer(f.delivery)} Made-to-order pieces arrive in the same time, and we ring or message you to book the day.`,
  link: { href: '/guides/how-long-does-sofa-delivery-take', label: 'How long sofa delivery takes' },
})

const payQuestion = (noun: string): Answer => ({
  id: 'pay',
  q: `Can I pay cash on delivery for ${noun}?`,
  a: `Yes. ${PAYING_ANSWER}`,
  link: { href: '/guides/how-paying-on-delivery-works', label: 'How paying on delivery works' },
})

const seeQuestion = (subject: string, withSamples: boolean): Answer | null => {
  const a = showroomAnswer(subject, withSamples)
  return a ? { id: 'see', q: 'Can I see them before I buy?', a, link: { href: '/visit-us', label: 'Visit our Burnley showroom' } } : null
}

/** Left or right hand: which of our corners have one longer side, from their measurements. */
function handAnswer(products: ListingProduct[]): Answer {
  const uneven = products.filter((p) => p.plan?.kind === 'corner' && p.plan.top !== p.plan.left)
  const names = [...new Set(uneven.map((p) => p.title.replace(/\s+(High|Scattered) Back$/i, '')))]
  return {
    id: 'hand',
    q: 'Do I need a left-hand or right-hand corner sofa?',
    a: uneven.length
      ? `Only if its two sides are different lengths, as on the ${andList.format(names)}. A 2c1 is two seats, the corner and one seat; a 1c2 is the same sofa in mirror image. Decide which wall the longer side goes against before you order, and if you’re not sure which version that is, send us a sketch on WhatsApp and we’ll tell you. Our other corners have two equal sides, so they go either way round.`
      : 'No: all our corner sofas have two equal sides, so they go either way round.',
    link: LEFT_RIGHT,
  }
}

const SIZE_GUIDE = { href: '/guides/choosing-the-right-size-sofa', label: 'Choosing the right size of sofa' }
const MEASURE_CORNER = { href: '/guides/measuring-for-a-corner-sofa', label: 'How to measure for a corner sofa' }
const LEFT_RIGHT = { href: '/guides/left-or-right-hand-corner-sofa', label: 'Left or right hand corner sofa?' }
const BACKS = { href: '/guides/high-back-or-scatter-back-sofa', label: 'High back or scatter back?' }
const PAYING = { href: '/guides/how-paying-on-delivery-works', label: 'How paying on delivery works' }
const DELIVERY = { href: '/guides/how-long-does-sofa-delivery-take', label: 'How long sofa delivery takes' }
const FABRIC = { href: '/guides/choosing-a-sofa-fabric', label: 'Choosing a sofa fabric' }
const LEATHER = { href: '/guides/tech-leather-and-leather-aire', label: 'Tech leather and Leather Aire explained' }
const RECLINER = { href: '/guides/electric-or-manual-recliner', label: 'Electric or manual recliner?' }
const MADE = { href: '/guides/what-made-to-order-means', label: 'What made to order means' }

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  sofas: {
    questions: (f) => [
      payQuestion('a sofa'),
      deliveryQuestion('a sofa', f),
      f.children.length
        ? {
            id: 'price',
            q: 'How much does a sofa cost at Heartwell?',
            a: `${andList.format(f.children.map((c) => `${c.name.toLowerCase()} from ${formatPrice(c.from)}`)).replace(/^./, (c) => c.toUpperCase())}. Every price includes free delivery to most of mainland Britain, and you pay on delivery.`,
          }
        : null,
      {
        id: 'shape',
        q: 'Which shape of sofa is right for my room?',
        a: 'A corner sofa seats the most people in the least floor space by tucking into the angle of a room. A U-shape needs space along three walls, or room to stand free. A 3+2 set is the easiest to arrange around a fireplace or television, and to move later. A recliner lets you put your feet up without a footstool. Whichever you choose, measure the room and the narrowest door on the way in first.',
        link: SIZE_GUIDE,
      },
      seeQuestion('the sofas you like', true),
    ],
    guides: [PAYING, DELIVERY, SIZE_GUIDE, MEASURE_CORNER, FABRIC],
  },

  'corner-sofas': {
    questions: (f) => {
      const underFiveHundred = f.products.filter((p) => p.price <= 500).sort((a, b) => a.price - b.price)
      return [
        { id: 'price', q: 'How much is a corner sofa?', a: priceAnswer('corner sofas', f.products) ?? '' },
        underFiveHundred.length
          ? {
              id: 'under-500',
              q: 'Do you have corner sofas under £500?',
              a: `Yes: ${andList.format(underFiveHundred.slice(0, 4).map((p) => `the ${p.title} at ${formatPrice(p.price)}`))}${underFiveHundred.length > 4 ? `, and ${underFiveHundred.length - 4} more` : ''}.`,
            }
          : null,
        deliveryQuestion('a corner sofa', f),
        payQuestion('a corner sofa'),
        {
          id: 'door',
          q: 'Will a corner sofa fit through my door?',
          a: 'Almost always: a corner sofa arrives in sections that go together in your room, so each part only has to pass through on its own. Compare a section’s depth with your narrowest door or hallway. Every corner sofa’s page has a door check and its measurements drawn to scale.',
          link: { href: '/will-it-fit', label: 'Will it fit?' },
        },
        handAnswer(f.products),
      ]
    },
    guides: [MEASURE_CORNER, LEFT_RIGHT, BACKS, DELIVERY, PAYING],
  },

  'u-shaped-sofas': {
    questions: (f) => {
      const sizes = f.products.map((p) => ({ p, size: listingSize(p) })).filter((x) => x.size)
      return [
        { id: 'price', q: 'How much is a U-shaped sofa?', a: priceAnswer('U-shaped sofas', f.products) ?? '' },
        sizes.length
          ? {
              id: 'space',
              q: 'How much space does a U-shaped sofa need?',
              a: `${sizes.map((x) => `The ${x.p.title} is ${x.size}`).join('. ')}. Leave room to walk around it and to open doors, and mark the shape out on the floor with tape before you order.`,
              link: SIZE_GUIDE,
            }
          : null,
        {
          id: 'sections',
          q: 'Does a U-shaped sofa come in one piece?',
          a: 'No. It arrives in sections that join together in your room, so it gets through ordinary doors and up stairs.',
          link: { href: '/will-it-fit', label: 'Will it fit?' },
        },
        deliveryQuestion('a U-shaped sofa', f),
        payQuestion('a U-shaped sofa'),
      ]
    },
    guides: [SIZE_GUIDE, MEASURE_CORNER, BACKS, PAYING],
  },

  '3-2-sofa-sets': {
    questions: (f) => {
      const sets = f.products.flatMap((p) => (p.plan?.kind === 'set' ? [p.plan.pieces] : []))
      const threes = sets.map((s) => s[0]?.w).filter((n): n is number => typeof n === 'number')
      const twos = sets.map((s) => s[1]?.w).filter((n): n is number => typeof n === 'number')
      const range = (ns: number[]) => (Math.min(...ns) === Math.max(...ns) ? `${Math.min(...ns)} cm` : `${Math.min(...ns)} to ${Math.max(...ns)} cm`)
      return [
        {
          id: 'what',
          q: 'What is a 3+2 sofa set?',
          a: 'A three-seater and a two-seater sofa in the same design and colour, sold together, so the room looks finished from day one. Both arrive on the same delivery.',
        },
        { id: 'price', q: 'How much is a 3+2 sofa set?', a: priceAnswer('3+2 sofa sets', f.products) ?? '' },
        threes.length && twos.length
          ? {
              id: 'size',
              q: 'How big are your 3+2 sofa sets?',
              a: `The three-seaters are ${range(threes)} wide and the two-seaters ${range(twos)} wide. Each set’s page lists both sofas’ measurements separately.`,
              link: SIZE_GUIDE,
            }
          : null,
        deliveryQuestion('a 3+2 sofa set', f),
        payQuestion('a 3+2 sofa set'),
      ]
    },
    guides: [SIZE_GUIDE, BACKS, PAYING, DELIVERY],
  },

  'fabric-sofas': {
    questions: (f) => {
      const ukMade = f.products.filter((p) => p.madeInUk && p.madeToOrder).length
      return [
        {
          id: 'best',
          q: 'Which fabric is best for a sofa?',
          a: 'Plush velvet has a deep colour and a soft sheen. Chenille is soft, hard-wearing and forgiving with family life. Crushed velvet has a textured shimmer. With pets or young children, a mid-tone colour in a tightly woven fabric hides everyday wear best.',
          link: FABRIC,
        },
        {
          id: 'choose',
          q: 'Can I choose my own fabric?',
          a: `Yes, on any made-to-order sofa: have the colour shown, or any of our ${f.fabricCount > 0 ? `${f.fabricCount} ` : ''}fabrics. Order samples first if the shade matters.`,
          link: { href: '/fabrics', label: 'See every fabric' },
        },
        ukMade
          ? { id: 'uk', q: 'Are your fabric sofas made in the UK?', a: `${ukMade} of our ${f.products.length} fabric sofas are made to order in the UK; each sofa’s page says where it’s made.`, link: MADE }
          : null,
        { id: 'price', q: 'How much is a fabric sofa?', a: priceAnswer('fabric sofas', f.products) ?? '' },
        deliveryQuestion('a fabric sofa', f),
      ]
    },
    guides: [FABRIC, MADE, PAYING],
  },

  'leather-sofas': {
    questions: (f) => [
      {
        id: 'real',
        q: 'Are these real leather sofas?',
        a: 'No. They’re leather-look: tech leather, Leather Aire and faux leather. They look like leather, wipe clean and cost less. Each sofa’s page names its cover, so you know exactly what you’re buying.',
        link: LEATHER,
      },
      {
        id: 'tech',
        q: 'What is tech leather?',
        a: 'A fabric with a leather-like finish: it looks and feels like leather, and wipes clean. It isn’t real leather.',
        link: LEATHER,
      },
      {
        id: 'aire',
        q: 'What is Leather Aire?',
        a: 'A soft leather-look material, sometimes called air leather. It looks like leather and wipes clean, but it isn’t real leather.',
        link: LEATHER,
      },
      { id: 'clean', q: 'How do I clean a leather-look sofa?', a: CARE.other.join(' '), link: { href: '/care-guide', label: 'The care guide' } },
      { id: 'price', q: 'How much is a leather-look sofa?', a: priceAnswer('leather-look sofas', f.products) ?? '' },
      deliveryQuestion('a leather-look sofa', f),
    ],
    guides: [LEATHER, RECLINER, PAYING],
  },

  recliners: {
    questions: (f) => {
      const electric = f.products.filter((p) => /electric/i.test(p.reclining ?? ''))
      const manual = f.products.filter((p) => /manual/i.test(p.reclining ?? ''))
      const lowE = cheapest(electric)
      const lowM = cheapest(manual)
      return [
        {
          id: 'which',
          q: 'Electric or manual recliner: which is better?',
          a: `Electric recliners move at the touch of a button and stop wherever you like, but need a plug socket nearby. Manual recliners work by hand, with no cables, and cost less.${lowM && lowE ? ` Ours start at ${formatPrice(lowM.price)} for manual and ${formatPrice(lowE.price)} for electric.` : ''}`,
          link: RECLINER,
        },
        {
          id: 'space',
          q: 'How much space does a recliner sofa need?',
          a: 'Leave room in front for the footrest and a gap behind for the back to tilt. Each recliner’s page has its measurements; if the space is tight, send us yours and we’ll check.',
        },
        {
          id: 'usb',
          q: 'Do your recliners have USB ports and cup holders?',
          a: 'Our electric recliners do: Hannah, Nova, Orlando, Oxford and Michigan all have USB ports and cup holders built in. Nova and Michigan add storage, and Michigan has wireless charging and Bluetooth speakers too. The manual Roma recliners keep it simple. Each recliner’s page lists exactly what’s included.',
        },
        { id: 'price', q: 'How much is a recliner sofa?', a: priceAnswer('recliners', f.products) ?? '' },
        deliveryQuestion('a recliner', f),
        payQuestion('a recliner'),
      ]
    },
    guides: [RECLINER, LEATHER, PAYING],
  },

  'electric-recliners': {
    questions: (f) => [
      {
        id: 'how',
        q: 'How does an electric recliner work?',
        a: 'Press a button and the footrest and back move together, stopping wherever you let go. It plugs into an ordinary socket, so plan for one nearby.',
        link: RECLINER,
      },
      {
        id: 'usb',
        q: 'Which electric recliners have USB ports?',
        a: 'All of them: Hannah, Nova, Orlando, Oxford and Michigan have USB ports and cup holders built in, and Michigan adds USB-C, wireless charging and Bluetooth speakers. Each sofa’s page lists exactly what’s included.',
      },
      { id: 'price', q: 'How much is an electric recliner sofa?', a: priceAnswer('electric recliners', f.products) ?? '' },
      deliveryQuestion('an electric recliner', f),
      payQuestion('an electric recliner'),
    ],
    guides: [RECLINER, LEATHER, PAYING],
  },

  'armchairs-and-footstools': {
    questions: (f) => {
      const ranges = rangeNames(f.products)
      return [
        ranges.length
          ? {
              id: 'match',
              q: 'Do the armchairs and footstools match your sofas?',
              a: `Yes, they’re made in the same designs as our sofas: ${andList.format(ranges)}. Choose the same colour and they sit together naturally.`,
            }
          : null,
        { id: 'price', q: 'How much is an armchair?', a: priceAnswer('armchairs and footstools', f.products) ?? '' },
        deliveryQuestion('an armchair', f),
        payQuestion('an armchair'),
      ]
    },
    guides: [SIZE_GUIDE, PAYING],
  },
}

/** A category's questions with empty answers left out. */
export function categoryQuestions(slug: string, facts: CategoryFacts): Answer[] {
  const content = CATEGORY_CONTENT[slug]
  if (!content || facts.products.length === 0) return []
  return content.questions(facts).filter((q): q is Answer => q !== null && q.a.trim() !== '')
}

export function categoryGuides(slug: string): { href: string; label: string }[] {
  return CATEGORY_CONTENT[slug]?.guides ?? []
}
