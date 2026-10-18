import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ContentPage } from '@/components/content/ContentPage'
import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import { BRAND } from '@/config/brand'
import { POLICIES, PROMISES } from '@/config/promises'

const ROOM = 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792009382/Home-Page-Furniture-Background-Image-3.avif'

export const metadata: Metadata = {
  title: 'About Heartwell',
  description: CONTACT.visitAddress
    ? `Heartwell is an online sofa shop in ${CONTACT.visitAddress.locality}, ${CONTACT.visitAddress.county}: sofas made to order, free delivery to most of mainland Britain, and you pay on delivery.`
    : `${BRAND.shortDescription} Here’s how we work, and why.`,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  const a = CONTACT.visitAddress
  return (
    <ContentPage
      title="About Heartwell"
      intro={<p>{BRAND.shortDescription}</p>}
      figure={
        // The owner's photo of the room every piece is photographed in (heartwell/Product Images/Elements).
        <div className="relative -mx-4 aspect-[4/3] overflow-hidden bg-alcove sm:mx-0 sm:rounded-[var(--radius-panel)]">
          <Image
            src={ROOM}
            alt="A beige corner sofa in a red velvet alcove, in a panelled room with a herringbone oak floor"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 768px) 736px, 100vw"
            className="object-cover"
          />
        </div>
      }
    >
      {/* The facts in one place, for people skimming and for search engines and AI assistants (docs/KEYWORDS.md). */}
      <h2 id="glance">Heartwell at a glance</h2>
      <ul>
        <li>
          An online sofa shop{a ? ` based in ${a.locality}, ${a.county}` : ''}, selling to homes across mainland Britain.
        </li>
        <li>Corner sofas, U-shaped sofas, 3+2 sets, recliners, armchairs and footstools, in ranges such as Verona, Ashton and Sims.</li>
        <li>You pay on delivery, in cash or by bank transfer, once the sofa is in your room: no deposit, no card details, no finance.</li>
        <li>
          {PROMISES.delivery.long} {PROMISES.delivery.timingLong}
        </li>
        <li>Many fabric sofas are made to order in the UK, in the colour shown or any fabric from our library.</li>
        {a && (
          <li>
            A showroom at {a.street}, {a.locality} {a.postcode}: {visitHoursText()}, by appointment.
          </li>
        )}
        <li>
          {CONTACT.phoneDisplay ? `Phone and WhatsApp ${CONTACT.phoneDisplay}, email ` : 'Email '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </li>
      </ul>

      <h2 id="why">Why you pay on delivery</h2>
      <p>
        Buying a sofa online from a name you haven’t heard of is a leap. So we take the risk instead of you: nothing is paid when you order, and you pay
        the driver in cash or by bank transfer only once your sofa is in your room and you’ve had a good look at it. No card details, no deposit.
      </p>

      <h2 id="how">How it works</h2>
      <ol className="hw-steps">
        <li>Choose your sofa online or on WhatsApp. It takes a couple of minutes, and there’s no account to set up.</li>
        <li>Tap Confirm on the link we send you, and we ring or WhatsApp to book your delivery day.</li>
        <li>We bring it to your room, free to most of mainland Britain. You check it, then you pay.</li>
      </ol>

      <h2 id="made-to-order">Made for you</h2>
      <p>
        {PROMISES.madeToOrder.long} If you’d like to see a fabric before you choose, we post <Link href="/fabric-samples">samples</Link>, and you can browse{' '}
        <Link href="/fabrics">every fabric</Link> online.
      </p>

      <h2 id="promises">What we promise</h2>
      <ul>
        <li>
          <strong>{PROMISES.delivery.label}:</strong> {PROMISES.delivery.long}
        </li>
        <li>
          <strong>{PROMISES.payment.label}:</strong> {PROMISES.payment.long}
        </li>
        <li>
          <strong>{PROMISES.guarantee.label}:</strong> {PROMISES.guarantee.long}
        </li>
        <li>
          <strong>{POLICIES.changeOfMindDays} days to change your mind</strong> on ready-made pieces, and faults always put right. The details are in{' '}
          <Link href="/delivery-and-returns">Delivery and returns</Link>.
        </li>
      </ul>

      <h2 id="reviews">Honest reviews only</h2>
      <p>
        Every review on this site comes from a customer who bought from us, through a private link we send after delivery. We publish the good and the
        bad (holding back only abuse or someone’s personal details), we never write them ourselves, and we never show a star rating we haven’t earned. You’ll find them on each sofa’s page and on our{' '}
        <Link href="/reviews">reviews page</Link>.
      </p>

      {a && (
        <>
          <h2 id="visit">Where we are</h2>
          <p>
            You’re welcome to visit us at {a.street}, {a.locality} {a.postcode}. {visitBookingText()} <Link href="/visit-us">How to visit</Link>.
          </p>
        </>
      )}

      <h2 id="talk">Talk to a person</h2>
      <p>
        Questions about a sofa, a fabric, a doorway or an order are answered by people who know the furniture. WhatsApp is quickest
        {CONTACT.phoneDisplay ? `, or ring ${CONTACT.phoneDisplay}` : ''}, or email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.{' '}
        <Link href="/contact">All the ways to reach us</Link>.
      </p>
    </ContentPage>
  )
}
