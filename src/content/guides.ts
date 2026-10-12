// Guides: plain answers to the questions people ask before buying a sofa
// online. Heartwell's own words; figures come from the single sources.
// Each block is plain text, so the same words feed the page, search engines
// and llms.txt.

import { POLICIES, PROMISES } from '@/config/promises'
import { SAMPLES } from '@/config/samples'

export type GuideBlock = { p: string } | { list: string[] } | { steps: string[] } | { note: { title: string; text: string } }

export interface GuideSection {
  id: string
  heading: string
  blocks: GuideBlock[]
}

export interface Guide {
  slug: string
  title: string
  /** One sentence for the guides list and search results. */
  summary: string
  /** ISO date the guide last changed. */
  updated: string
  sections: GuideSection[]
  /** Where to go next. */
  next: { href: string; label: string }[]
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-paying-on-delivery-works',
    title: 'How paying on delivery works',
    summary: 'Nothing to pay when you order: you pay the driver once your sofa is in your room. Here’s each step.',
    updated: '2026-10-12',
    sections: [
      {
        id: 'why',
        heading: 'Why we do it this way',
        blocks: [
          {
            p: 'Ordering a sofa online means trusting a shop you may never have used before. Paying on delivery takes that worry away: you see the sofa, in your home, before any money changes hands.',
          },
        ],
      },
      {
        id: 'steps',
        heading: 'Step by step',
        blocks: [
          {
            steps: [
              'Order online or on WhatsApp. You give your name, mobile, email and address; there are no card details and no account.',
              'We send you a link by email and WhatsApp. Tap Confirm and your order goes ahead. If you don’t, nothing happens and you owe nothing.',
              'We ring or WhatsApp you to book your delivery day.',
              'The driver brings it into your room. Have a good look at it.',
              'You pay the driver in cash, or by bank transfer while they’re there. That’s it.',
            ],
          },
        ],
      },
      {
        id: 'transfer',
        heading: 'Paying by bank transfer',
        blocks: [
          {
            p: 'If you’d rather not have cash in the house, pay by bank transfer while the driver is with you. Either way, you never pay for furniture you haven’t seen.',
          },
          {
            note: {
              title: 'Staying safe',
              text: 'We never ask for payment for furniture before it’s delivered, and we never ask for card details. If anyone claiming to be from Heartwell asks you to pay for furniture in advance, don’t, and tell us.',
            },
          },
        ],
      },
      {
        id: 'problem',
        heading: 'If something isn’t right',
        blocks: [
          {
            p: `Say so before you pay, and we’ll sort it out first. If you spot damage after the driver has gone, send us photos within ${POLICIES.damageReportHours} hours and we’ll put it right.`,
          },
        ],
      },
    ],
    next: [
      { href: '/delivery-and-returns', label: 'Delivery and returns' },
      { href: '/faq', label: 'Questions and answers' },
    ],
  },
  {
    slug: 'what-made-to-order-means',
    title: 'What “made to order” means',
    summary: 'Made-to-order sofas are made for you, in the fabric you choose. What that means for choice, timing and returns.',
    updated: '2026-10-12',
    sections: [
      {
        id: 'meaning',
        heading: 'Made for you, not taken off a shelf',
        blocks: [
          {
            p: `${PROMISES.madeToOrder.long} Instead of being limited to the colours in a warehouse, you can have the sofa in the colour shown or in any fabric from our library.`,
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Choosing your fabric',
        blocks: [
          {
            p: 'On a made-to-order sofa’s page, choose a colour or tap to see every fabric. Screens show colours a little differently, so if the shade matters, see the fabric first.',
          },
          {
            list: [
              `Order a set of samples for ${SAMPLES.fee}, and the ${SAMPLES.fee} comes off your sofa if you buy.`,
              'Look at them in your room, in daylight and in the evening.',
              'Then order the sofa in the one you like best.',
            ],
          },
        ],
      },
      {
        id: 'timing',
        heading: 'How long it takes',
        blocks: [{ p: `${PROMISES.delivery.timingLong} We ring you to book the day once your order is confirmed.` }],
      },
      {
        id: 'returns',
        heading: 'Changing your mind',
        blocks: [
          {
            p: `Because it’s made to your choice, the ${POLICIES.changeOfMindDays}-day change-of-mind right doesn’t apply to a made-to-order piece. You can still change or cancel it within ${POLICIES.madeToOrderChangeWorkingDays} working days of ordering, before it goes into production, and faults are always covered, exactly as for everything else.`,
          },
          { p: 'That’s why we suggest checking the measurements and seeing a sample before you order.' },
        ],
      },
    ],
    next: [
      { href: '/fabrics', label: 'See all fabrics' },
      { href: SAMPLES.href, label: 'Order fabric samples' },
    ],
  },
  {
    slug: 'measuring-for-a-corner-sofa',
    title: 'How to measure for a corner sofa',
    summary: 'Which way round, how much room to leave, and how a corner sofa gets through your door.',
    updated: '2026-10-12',
    sections: [
      {
        id: 'sides',
        heading: 'Work out which side the corner goes',
        blocks: [
          {
            p: 'Stand facing where the sofa will go, as if you were sitting looking out. If the longer part should run to your left, you want the corner on the left. Our product pages show the shape and both side lengths.',
          },
        ],
      },
      {
        id: 'walls',
        heading: 'Measure both walls',
        blocks: [
          {
            steps: [
              'Measure each wall from the corner to where the sofa should stop.',
              'Take off room for skirting boards, radiators and sockets you’ll want to reach.',
              'Compare with the sofa’s two side lengths. Leave a little space at each end so it doesn’t look squeezed.',
              'Check the depth too: it decides how far into the room the sofa comes.',
            ],
          },
        ],
      },
      {
        id: 'space',
        heading: 'Leave room to live around it',
        blocks: [
          {
            list: [
              'Around 60 cm is a comfortable walkway; more in front of a door.',
              'Around 40 to 50 cm between the sofa and a coffee table.',
              'Mark the shape on the floor with masking tape and leave it for a day. It’s the quickest way to see whether it feels right.',
            ],
          },
        ],
      },
      {
        id: 'door',
        heading: 'Getting it through the door',
        blocks: [
          {
            p: 'Corner sofas come in sections, so each section goes through your door on its own. What matters is the depth of the sofa against the narrowest door, hallway or turn on the way in. Our measuring guide shows how to check.',
          },
        ],
      },
    ],
    next: [
      { href: '/will-it-fit', label: 'Will it fit? Measuring guide' },
      { href: '/sofas/corner-sofas', label: 'Corner sofas' },
    ],
  },
  {
    slug: 'choosing-the-right-size-sofa',
    title: 'Choosing the right size of sofa',
    summary: 'Two-seater, three-seater, corner or U-shape: how to match the sofa to your room and the way you use it.',
    updated: '2026-10-12',
    sections: [
      {
        id: 'people',
        heading: 'Start with how you use it',
        blocks: [
          {
            list: [
              'Who sits on it on an ordinary evening, and does anyone like to lie down?',
              'Do you have guests often, or is it mostly the two of you?',
              'Is it the only sofa in the room, or part of a pair?',
            ],
          },
        ],
      },
      {
        id: 'shapes',
        heading: 'Which shape suits which room',
        blocks: [
          {
            list: [
              'A 2 or 3 seater suits smaller rooms and goes against one wall.',
              'A 3+2 set seats more people and lets you arrange the room around a fireplace or TV.',
              'A corner sofa uses a corner that’s otherwise wasted and gives plenty of seats, but needs two free walls.',
              'A U-shape is for bigger rooms and big families: it needs three sides of space and a clear way in.',
            ],
          },
        ],
      },
      {
        id: 'measure',
        heading: 'Measure before you fall in love',
        blocks: [
          {
            p: 'Every product page lists the width, depth and height, with a drawing. Mark the width and depth on your floor with masking tape, check you can walk round it, and check the depth or height against your narrowest door.',
          },
          { note: { title: 'Not sure?', text: 'Send us a photo of the room and your measurements on WhatsApp and we’ll suggest what would fit.' } },
        ],
      },
    ],
    next: [
      { href: '/will-it-fit', label: 'Will it fit? Measuring guide' },
      { href: '/sofas', label: 'Browse sofas' },
    ],
  },
  {
    slug: 'choosing-a-sofa-fabric',
    title: 'Choosing a sofa fabric',
    summary: 'Velvet, crushed velvet, chenille or a wipe-clean finish: what each is like to live with.',
    updated: '2026-10-12',
    sections: [
      {
        id: 'velvet',
        heading: 'Velvet',
        blocks: [
          {
            p: 'Soft, rich and deep in colour. Velvet has a short pile that catches the light, so it looks lighter or darker where it’s been sat on or brushed. That’s normal, and a soft brush lifts it. Its tight pile has no loops for claws to catch, though pet hair shows on dark colours.',
          },
        ],
      },
      {
        id: 'crushed',
        heading: 'Crushed velvet',
        blocks: [{ p: 'Velvet with a crinkled, shimmering finish. Because the pattern is uneven on purpose, everyday marks and creases show much less.' }],
      },
      {
        id: 'chenille',
        heading: 'Chenille',
        blocks: [{ p: 'A soft, textured weave with a matt look. It feels cosy and suits a relaxed, lived-in room.' }],
      },
      {
        id: 'wipe-clean',
        heading: 'Leather and leather-look',
        blocks: [
          {
            p: 'Smooth and wipe-clean, which suits homes with young children. It feels cool at first and warms up as you sit. Keep it out of strong sun and away from radiators so it doesn’t dry out. Each product page says exactly what the cover is.',
          },
        ],
      },
      {
        id: 'life',
        heading: 'Thinking about your home',
        blocks: [
          {
            list: [
              'Sunny room? Mid-tones fade less noticeably than very dark or very bright colours.',
              'Pets? Choose a colour close to their fur, and avoid loose, loopy weaves.',
              'Young children? A wipe-clean finish, or a mid-tone fabric that hides marks.',
              'Not sure? See the real thing first: samples come by post.',
            ],
          },
        ],
      },
    ],
    next: [
      { href: '/fabrics', label: 'See all fabrics' },
      { href: SAMPLES.href, label: 'Order fabric samples' },
      { href: '/care-guide', label: 'Care guide' },
    ],
  },
  {
    slug: 'getting-ready-for-delivery-day',
    title: 'Getting ready for delivery day',
    summary: 'A short checklist so your sofa goes in smoothly, and what happens when the driver arrives.',
    updated: '2026-10-12',
    sections: [
      {
        id: 'before',
        heading: 'The day before',
        blocks: [
          {
            list: [
              'Clear the way from the door to the room: shoes, coats, rugs and anything fragile.',
              'If we’re taking your old sofa away, empty it and have it ready to go first.',
              'Think about parking: the van needs to stop close to your door.',
              'Make sure someone will be in for the whole delivery window.',
            ],
          },
        ],
      },
      {
        id: 'on-the-day',
        heading: 'When the driver arrives',
        blocks: [
          {
            steps: [
              'The driver brings the sofa in. If you chose carrying upstairs or assembly, that’s done too.',
              'Have a good look at it before the driver goes: the fabric, the frame, the legs and the cushions.',
              'Pay the driver in cash or by bank transfer.',
            ],
          },
          {
            note: {
              title: 'Can’t be in after all?',
              text: `Tell us as early as you can and we’ll move it, free. If nobody is in on the booked day, re-delivery costs £${POLICIES.missedDeliveryCharge}.`,
            },
          },
        ],
      },
      {
        id: 'after',
        heading: 'Afterwards',
        blocks: [
          {
            p: `Cushions settle over the first couple of weeks: plump them daily for a while. If you notice any damage after the driver has left, send us photos within ${POLICIES.damageReportHours} hours.`,
          },
        ],
      },
    ],
    next: [
      { href: '/delivery-and-returns', label: 'Delivery and returns' },
      { href: '/care-guide', label: 'Care guide' },
    ],
  },
]

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null
