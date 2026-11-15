// Questions customers ask, answered once. The FAQ page, the home page and
// llms.txt all read these, and every figure comes from a single source:
// promises and policies (src/config/promises.ts), contact details
// (src/config/contact.ts) and the shop's delivery prices (shop_settings),
// so an answer can never disagree with checkout.

import { CONTACT, visitBookingText } from '@/config/contact'
import { POLICIES, PROMISES } from '@/config/promises'
import { SAMPLES } from '@/config/samples'
import { formatPrice } from '@/lib/format'

export interface FaqItem {
  id: string
  q: string
  /** Plain text: shown on the page, and used as is for search engines and llms.txt. */
  a: string
  link?: { href: string; label: string }
}

export interface FaqGroup {
  id: string
  title: string
  items: FaqItem[]
}

/** The shop settings an answer may quote. Null when the database can't be read: those answers are left out. */
export interface FaqFacts {
  upstairsFirstFloor: number
  upstairsPerExtraFloor: number
  assemblyFee: number
  removalPerSeat: number
  /** The mainland areas with a delivery charge (delivery_areas). */
  areas?: { name: string; charge: number }[]
}

export function faqGroups(facts: FaqFacts | null, extras: { fabricCount: number; sampleLimit: number | null }): FaqGroup[] {
  const phone = CONTACT.phoneDisplay
  const a = CONTACT.visitAddress
  return [
    {
      id: 'ordering',
      title: 'Ordering and paying',
      items: [
        {
          id: 'how-pay',
          q: 'How do I pay?',
          a: 'You pay the driver the full price when your furniture arrives, in one payment, in cash or by bank transfer. Nothing is taken when you order, and we never ask for card details.',
        },
        {
          id: 'finance',
          q: 'Do you offer finance, a payment plan or a deposit?',
          a: 'No. We don’t offer finance, pay-monthly plans or instalments, and we don’t take deposits. The whole price is paid to the driver on the day your furniture is delivered.',
        },
        {
          id: 'confirm',
          q: 'How do I confirm my order?',
          a: 'After you order, tap Ask for confirmation on your order page (it’s in your order email too). It opens WhatsApp with your order number; we reply with the details we have, you check them and reply Confirm, and we ring to book your delivery. Until you confirm, nothing happens and you owe nothing.',
        },
        {
          id: 'order-by-phone',
          q: 'Can I order on WhatsApp or by phone?',
          a: `Yes. Message us on WhatsApp${phone ? ` or ring ${phone}` : ''} and we’ll take your order with you.`,
          link: { href: '/contact', label: 'Contact us' },
        },
        {
          id: 'change-cancel',
          q: 'Can I change or cancel my order?',
          a: "Yes. You can cancel a standard catalogue order before delivery, including a sofa made in a standard fabric. Contact us with your order number.",
          link: { href: '/delivery-and-returns#changes', label: 'Changes and cancellations' },
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      items: [
        { id: 'when', q: 'When will my sofa arrive?', a: `${PROMISES.delivery.timingLong} We ring you to book the day.` },
        {
          id: 'where',
          q: 'Do you deliver to my area?',
          a: `${PROMISES.delivery.long}${facts?.areas?.length ? ` The charges: ${facts.areas.map((d) => `${d.name} ${formatPrice(d.charge)}`).join(', ')}.` : ''} Northern Ireland, the Isle of Man, the Channel Islands, the Isle of Wight, the Scottish islands and the Isles of Scilly are delivered by arrangement: enter your postcode on any product page and we’ll tell you straight away, then quote on WhatsApp.`,
        },
        ...(facts
          ? [
              {
                id: 'upstairs',
                q: 'Can you carry it upstairs?',
                a: `Yes, add it at checkout: ${formatPrice(facts.upstairsFirstFloor)} for the first floor (or any floor with a lift), and ${formatPrice(facts.upstairsPerExtraFloor)} for each floor above that without a lift.`,
              },
              {
                id: 'assembly',
                q: 'Will you put it together?',
                a: `Yes, if you’d like: assembly in your room is ${formatPrice(facts.assemblyFee)}, added at checkout.`,
              },
              {
                id: 'removal',
                q: 'Can you take my old sofa away?',
                a: `Yes: ${formatPrice(facts.removalPerSeat)} a seat, added at checkout. Count every seat of the furniture we’re taking.`,
              },
            ]
          : []),
        {
          id: 'missed',
          q: 'What if I miss my delivery?',
          a: `If the booked day stops working, tell us as early as you can and we’ll rearrange it free. If nobody is in when the driver arrives, the trip has to be made again, so a ${formatPrice(POLICIES.missedDeliveryCharge)} re-delivery charge applies.`,
        },
        {
          id: 'fit',
          q: 'Will it fit through my door?',
          a: 'Measure the narrowest door, hallway or turn on the way in, and compare it with the sofa’s depth or height (sofas go through on their side). Every product page has a quick check, and corner and U-shaped sofas come in sections.',
          link: { href: '/will-it-fit', label: 'Measuring guide' },
        },
      ],
    },
    {
      id: 'returns',
      title: 'Returns, faults and the guarantee',
      items: [
        {
          id: 'change-mind',
          q: 'Can I return a sofa if I change my mind?',
          a: PROMISES.returns.long,
          link: { href: '/delivery-and-returns#returns', label: 'Delivery and returns' },
        },
        {
          id: 'damaged',
          q: 'What if it arrives damaged?',
          a: `Check it before you pay: if something is wrong, show the driver and we’ll put it right. If you find damage later, send us photos within ${POLICIES.damageReportHours} hours of delivery and we’ll repair it, replace it or refund you, and collect it free if it has to come back.`,
        },
        {
          id: 'guarantee',
          q: 'What does the guarantee cover?',
          a: `Every sofa has a ${POLICIES.guaranteeYears}-year guarantee on the frame and foam, on top of your legal rights. It doesn’t cover normal wear, accidental damage or fading from sunlight.`,
        },
      ],
    },
    {
      id: 'sofas',
      title: 'Sofas and fabrics',
      items: [
        {
          id: 'fabric',
          q: 'Can I have a sofa in a different fabric?',
          a: `Yes, on made-to-order sofas: choose from ${extras.fabricCount > 0 ? `our ${extras.fabricCount}` : 'our'} fabrics on the sofa’s page.`,
          link: { href: '/fabrics', label: 'See the fabrics' },
        },
        {
          id: 'samples',
          q: 'Can I see the fabrics first?',
          a: `Yes. Order up to ${extras.sampleLimit ?? 5} samples for ${SAMPLES.fee}, and the ${SAMPLES.fee} comes off your sofa if you buy. We arrange the ${SAMPLES.fee} with you on a call or WhatsApp before posting them.`,
          link: { href: SAMPLES.href, label: 'Order samples' },
        },
        ...(a
          ? [
              {
                id: 'visit',
                q: 'Can I come and see you?',
                a: `Yes, at ${a.street}, ${a.locality} ${a.postcode}. ${visitBookingText()} When you book, tell us which sofas you’re interested in and we’ll tell you what we can show you.`,
                link: { href: '/visit-us', label: 'Visit us' },
              },
            ]
          : []),
        {
          id: 'care',
          q: 'How do I look after my sofa?',
          a: 'Plump and turn the cushions every week, vacuum gently, blot spills straight away and keep it out of strong sun and away from radiators.',
          link: { href: '/care-guide', label: 'Care guide' },
        },
      ],
    },
  ]
}

/** Every question, for FAQ structured data. */
export const allFaqItems = (groups: FaqGroup[]) => groups.flatMap((g) => g.items)
