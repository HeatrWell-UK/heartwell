// Guides: plain answers to the questions people ask before buying a sofa
// online. Heartwell's own words; figures come from the single sources.
// Each block is plain text, so the same words feed the page, search engines
// and llms.txt.

import { CARE } from '@/config/care'
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
  /** ISO date it first appeared, when that's earlier than the last change. */
  published?: string
  sections: GuideSection[]
  /** Where to go next. */
  next: { href: string; label: string }[]
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-paying-on-delivery-works',
    // Search Console, 31 October 2026: shown for "pay on delivery sofas" (position 9.8); the home page leads for "cash on delivery".
    title: 'Pay on delivery sofas: how cash on delivery works',
    summary: 'No deposit, no card: you pay the driver in cash or by bank transfer once your sofa is in your room. Here’s each step, and how to buy cash on delivery safely.',
    updated: '2026-10-31',
    published: '2026-10-12',
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
        id: 'safe',
        heading: 'Is it safe to buy a sofa cash on delivery?',
        blocks: [
          {
            p: 'Paying on delivery is the safest way to buy a sofa you haven’t seen, because no money changes hands until it’s in your home. The risk people worry about runs the other way: sellers on social media who ask for a deposit or a “delivery fee” first and then disappear. Before you buy cash on delivery from anyone, check that:',
          },
          {
            list: [
              'they have a real address you can visit, and a phone number that’s answered;',
              'the full price is in writing before delivery, with nothing to pay upfront;',
              'you can look the sofa over before you pay.',
            ],
          },
          {
            p: 'With us, that’s a showroom you can visit by appointment, a phone and WhatsApp line that’s answered, and an order email with the full price before anything is delivered.',
          },
        ],
      },
      {
        id: 'deposit',
        heading: 'No deposit, no card, no finance',
        blocks: [
          {
            p: 'There’s no deposit to pay and we never ask for card details. We don’t offer finance or pay-monthly plans either: you pay the full price, once, when the sofa arrives.',
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
    updated: '2026-10-18',
    published: '2026-10-12',
    sections: [
      {
        id: 'sides',
        heading: 'Work out which side the corner goes',
        blocks: [
          {
            p: 'Most of our corners have two equal sides and go either way round. If yours has one longer side (a 2c1 or 1c2), decide which wall the longer side goes against before you order. Our product pages show the shape and both side lengths, and our left or right hand guide explains the codes.',
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
      { href: '/guides/left-or-right-hand-corner-sofa', label: 'Left or right hand corner sofa?' },
      { href: '/will-it-fit', label: 'Will it fit? Measuring guide' },
      { href: '/sofas/corner-sofas', label: 'Corner sofas' },
    ],
  },
  {
    slug: 'choosing-the-right-size-sofa',
    title: 'What size sofa do I need? Choosing the right size',
    summary: 'Two-seater, three-seater, corner or U-shape: how to match the sofa to your room and the way you use it, with rules of thumb for each size of room.',
    updated: '2026-10-18',
    published: '2026-10-12',
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
      {
        id: 'room',
        heading: 'What size of sofa for the size of room',
        blocks: [
          { p: 'Rules of thumb that work in most British living rooms (a metre is about 3 feet 3 inches):' },
          {
            list: [
              'A sofa looks right at about two thirds of the length of the wall it stands against.',
              'Small room, around 3 × 3.5 m (10 × 12 ft): a 2 or 3 seater, up to about 200 cm wide.',
              'Medium room, around 3.7 × 4.3 m (12 × 14 ft): a 3+2 set, or a corner up to about 240 cm each way.',
              'Large or open-plan room, 4.5 m (15 ft) or more: a large corner or a U-shape, with space to walk all the way round.',
              'Leave about 60 cm for walkways, and 40 to 50 cm between the sofa and a coffee table.',
            ],
          },
        ],
      },
    ],
    next: [
      { href: '/will-it-fit', label: 'Will it fit? Measuring guide' },
      { href: '/guides/high-back-or-scatter-back-sofa', label: 'High back or scatter back?' },
      { href: '/sofas', label: 'Browse sofas' },
    ],
  },
  {
    slug: 'choosing-a-sofa-fabric',
    title: 'Choosing a sofa fabric: velvet, chenille and more',
    summary: 'Velvet, crushed velvet, chenille or a wipe-clean finish: what each is like to live with, and which suits pets, children and sunny rooms.',
    updated: '2026-10-18',
    published: '2026-10-12',
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
        heading: 'The best sofa fabric for pets, children and sunny rooms',
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
    slug: 'how-long-does-sofa-delivery-take',
    title: 'How long does sofa delivery take?',
    summary: `Most Heartwell orders arrive in ${PROMISES.delivery.timingShort}, made-to-order sofas included. What decides your day, how we book it, and the areas that take longer.`,
    updated: '2026-10-18',
    sections: [
      {
        id: 'short-answer',
        heading: 'The short answer',
        blocks: [
          {
            p: `${PROMISES.delivery.timingLong} That includes made-to-order sofas: there’s no wait of several weeks while yours is made.`,
          },
        ],
      },
      {
        id: 'what-decides',
        heading: 'What decides your delivery day',
        blocks: [
          {
            list: [
              `Where you live: most postcodes take ${PROMISES.delivery.timingShort}; ${PROMISES.delivery.chargedAreas} take ${PROMISES.delivery.chargedTiming} and have a delivery charge, shown as soon as you enter your postcode.`,
              'When you confirm: we book your day once you’ve tapped Confirm on the link we send.',
              'The day of the week: we don’t deliver on Mondays.',
              'The day that suits you: at checkout you choose a preferred day from the dates on offer.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'How we book it',
        blocks: [
          {
            steps: [
              'You order online or on WhatsApp, then tap Confirm on the link we send by email and WhatsApp.',
              'We ring or WhatsApp you to agree the day.',
              'The driver brings the sofa into your room, and you pay once you’ve seen it.',
            ],
          },
        ],
      },
      {
        id: 'next-day',
        heading: 'Can I get a sofa next day?',
        blocks: [
          {
            p: 'Not from us: two working days is the soonest we deliver. In return, it’s brought into the room you choose, and there’s nothing to pay until it’s there.',
          },
        ],
      },
      {
        id: 'islands',
        heading: 'Islands and Northern Ireland',
        blocks: [
          {
            p: 'Northern Ireland, the Isle of Man, the Channel Islands, the Isle of Wight, the Scottish islands and the Isles of Scilly are delivered by arrangement. Enter your postcode on any product page and we’ll quote on WhatsApp.',
          },
        ],
      },
    ],
    next: [
      { href: '/delivery-and-returns', label: 'Delivery and returns' },
      { href: '/guides/getting-ready-for-delivery-day', label: 'Getting ready for delivery day' },
    ],
  },
  {
    slug: 'high-back-or-scatter-back-sofa',
    // Search Console, 27 and 31 October 2026: shown most for "scatter back sofa vs standard back" (position 9.3), then
    // "what is a scatter back sofa", "scatter back vs fullback sofa".
    title: 'Scatter back vs standard back sofa (high or full back)',
    summary: 'What is a scatter back sofa? Loose back cushions for a softer, relaxed look. A standard back (high or full back) has fixed cushions and a tailored shape. Which suits you.',
    updated: '2026-10-31',
    sections: [
      {
        id: 'difference',
        heading: 'The difference',
        blocks: [
          {
            p: 'On a high back sofa (also called a full back or fixed back), the back cushions are fixed in place, so it keeps a neat, tailored shape and supports your head. On a scatter back sofa (or scattered back), the back is a row of loose cushions you can plump, move and arrange.',
          },
        ],
      },
      {
        id: 'compare',
        heading: 'How they compare',
        blocks: [
          {
            list: [
              'Look: a high back is smart and tailored; a scatter back is soft and relaxed.',
              'Comfort: a high back gives firm support up to your head; a scatter back lets you sink in and arrange the cushions the way you like.',
              'Upkeep: a high back needs little more than a weekly plump; scatter cushions need plumping and straightening more often to look their best.',
              'Size: in our ranges both styles come in the same sizes, but the depth can differ by a few centimetres, so check the measurements on the page you choose.',
            ],
          },
        ],
      },
      {
        id: 'which',
        heading: 'Which suits you',
        blocks: [
          {
            list: [
              'Choose a high back if you like to sit upright, want support for your head, or prefer a neat look with little fuss.',
              'Choose a scatter back if you like to curl up or lie down, enjoy rearranging cushions, and like a softer, lived-in look.',
            ],
          },
        ],
      },
      {
        id: 'ours',
        heading: 'Our ranges with both',
        blocks: [
          {
            p: 'Ashton, Sims and Verona come with a high back or a scattered back, and each range’s page shows both side by side with their prices. Our classic 5 seater corners, such as Harrison, Olympia and Windsor, have scattered backs.',
          },
        ],
      },
    ],
    next: [
      { href: '/ranges/verona', label: 'The Verona range' },
      { href: '/ranges/ashton', label: 'The Ashton range' },
      { href: '/ranges', label: 'All ranges' },
    ],
  },
  {
    slug: 'left-or-right-hand-corner-sofa',
    title: 'Left or right hand corner sofa: which do you need?',
    summary: 'What 2c2, 2c1 and 1c2 mean, how to work out which way round your corner sofa should go, and when it doesn’t matter at all.',
    updated: '2026-10-23',
    published: '2026-10-18',
    sections: [
      {
        id: 'codes',
        heading: 'What 2c2, 2c1 and 1c2 mean',
        blocks: [
          {
            list: [
              '2c2: two seats, the corner, then two seats. Both sides are the same length, so it goes either way round. Nearly all our 5 seater corners are like this; the Michigan recliner corner is longer on one side.',
              '2c1: two seats, the corner, then one seat. A 4 seater with one side longer than the other.',
              '1c2: the same sofa in mirror image.',
            ],
          },
          {
            p: 'L-shapes and armed U-shapes can have one longer side too: the drawing on each sofa’s page shows the length of every side.',
          },
        ],
      },
      {
        id: 'work-out',
        heading: 'Working out which you need',
        blocks: [
          {
            steps: [
              'Decide where the corner of the sofa will sit, usually in the corner of the room.',
              'Measure the two walls it will run along, each from the corner.',
              'Choose which wall takes the longer side: usually the longer wall, or the one facing the television.',
              'Stand in the room looking at that corner and note whether the longer side is on your left or your right.',
              'Tell us, or send a quick sketch on WhatsApp, and we’ll confirm whether that’s the 2c1 or the 1c2 before you order.',
            ],
          },
        ],
      },
      {
        id: 'shops-differ',
        heading: 'Why shops disagree about “left hand”',
        blocks: [
          {
            p: 'Some shops describe a corner sofa as you face it, others as if you were sitting on it, so “left hand” can mean opposite things. That’s why we’d rather check with you than guess: on most corner sofas the sides can’t be swapped once it’s made.',
          },
        ],
      },
      {
        id: 'equal',
        heading: 'When it doesn’t matter',
        blocks: [
          {
            p: 'A corner with two equal sides fits either way round, so you only need to decide where it goes. That’s nearly every 5 seater corner we sell: each sofa’s page shows the length of both sides.',
          },
        ],
      },
    ],
    next: [
      { href: '/guides/measuring-for-a-corner-sofa', label: 'How to measure for a corner sofa' },
      { href: '/sofas/corner-sofas', label: 'Corner sofas' },
    ],
  },
  {
    slug: 'electric-or-manual-recliner',
    title: 'Electric or manual recliner sofa: which is better?',
    summary: 'Electric recliners move at the press of a button; manual ones need no plug and cost less. How they compare, the space each needs and which to choose.',
    updated: '2026-10-23',
    published: '2026-10-18',
    sections: [
      {
        id: 'difference',
        heading: 'The difference',
        blocks: [
          {
            p: 'A manual recliner reclines by hand: you pull a handle or lean back, and there are no cables or plugs. An electric recliner (also called a power recliner) moves when you press a button and stops wherever you let go.',
          },
        ],
      },
      {
        id: 'compare',
        heading: 'How they compare',
        blocks: [
          {
            list: [
              'Ease: electric is effortless and stops at any angle; manual takes a little push.',
              'Power: electric needs a plug socket near the sofa, with a cable running to it; manual needs neither, so it can stand anywhere in the room.',
              'Extras: electric recliners often have USB ports and cup holders built in, as all of ours do; our Michigan adds wireless charging and Bluetooth speakers.',
              'Price: manual recliners cost less. Our manual Roma recliners start at a lower price than our electric ones.',
            ],
          },
        ],
      },
      {
        id: 'space',
        heading: 'The space a recliner needs',
        blocks: [
          {
            p: 'Either kind needs room in front for the footrest and a gap behind for the back to tilt. Check the measurements on the sofa’s page against your room, and leave space to walk past it while it’s reclined.',
          },
        ],
      },
      {
        id: 'which',
        heading: 'Which to choose',
        blocks: [
          {
            list: [
              'Electric, if anyone at home finds a handle hard to use, or you want to stop at exactly the right angle.',
              'Manual, if there’s no socket where the sofa will go, or you’d like the lower price.',
            ],
          },
        ],
      },
    ],
    next: [
      { href: '/sofas/recliners', label: 'Recliner sofas' },
      { href: '/sofas/electric-recliners', label: 'Electric recliners' },
    ],
  },
  {
    slug: 'tech-leather-and-leather-aire',
    // Search Console, 27 and 31 October 2026: Leather Aire searches lead ("what is leather aire", "leather aire material",
    // "air leather", "what is aire leather"), then "what is tech leather" (position 6.3).
    title: 'What is Leather Aire (air leather)? Tech leather explained',
    summary: 'Leather Aire (air leather) and tech leather are leather-look fabrics, not real leather. What each one is made of, how it feels, wears and cleans, so you know what you’re buying.',
    updated: '2026-10-31',
    published: '2026-10-18',
    sections: [
      {
        id: 'short-answer',
        heading: 'The short answer',
        blocks: [
          {
            p: 'Tech leather, Leather Aire and faux leather are leather-look covers: man-made materials that look like leather and wipe clean. None of them is real leather, and every Heartwell sofa’s page names its cover.',
          },
        ],
      },
      {
        id: 'tech',
        heading: 'Tech leather',
        blocks: [
          {
            p: 'A fabric with a leather-like finish. It looks and feels like leather, wipes clean and costs less than the real thing. Our Orlando, Nova and Oxford electric recliners are covered in it, and Michigan in tech air leather, a version of the same thing.',
          },
        ],
      },
      {
        id: 'aire',
        heading: 'Leather Aire',
        blocks: [
          {
            p: 'Leather Aire, also called air leather or leather air, is a man-made, leather-look upholstery material: a soft polyurethane (PU) finish on a fabric backing. It’s made to breathe a little more than ordinary faux leather (the “air” in the name), so it feels softer and less sticky in a warm room. It isn’t real leather, and it wipes clean like the other leather-look covers.',
          },
          { p: 'Our Roma recliners come in Leather Aire in several colours, or in grey fabric.' },
        ],
      },
      {
        id: 'faux',
        heading: 'Faux leather',
        blocks: [
          {
            p: 'The classic leather-look cover, with a smooth finish. Our Oakland corner is covered in it, and Shannon and Tango use it on the arms, where hands rest most.',
          },
        ],
      },
      {
        id: 'care',
        heading: 'Looking after it',
        blocks: [{ list: [...CARE.other] }],
      },
      {
        id: 'real',
        heading: 'If you want real leather',
        blocks: [{ p: 'Ask us before you order and we’ll tell you honestly what we can offer.' }],
      },
    ],
    next: [
      { href: '/sofas/leather-sofas', label: 'Leather-look sofas' },
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
