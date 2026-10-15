import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { addressLine, directionsHref, VisitUs } from '@/components/home/VisitUs'
import { BRAND } from '@/config/brand'
import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import { SITE_URL } from '@/config/site'
import { jsonLdString } from '@/lib/product/seo'
import { BritainMap } from '@/components/content/BritainMap'

// The page exists only while there's an address (src/config/contact.ts); without one it's a 404, never a placeholder.
const a = CONTACT.visitAddress

export const metadata: Metadata = {
  title: 'Visit us',
  description: a ? `See Heartwell’s sofas and fabrics at ${addressLine(a)}. ${visitHoursText()}. ${visitBookingText()}` : undefined,
  alternates: { canonical: '/visit-us' },
}

export default function VisitUsPage() {
  if (!a) notFound()
  const v = CONTACT.visit
  const business = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${SITE_URL}/visit-us#store`,
    name: BRAND.name,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image.jpg`,
    email: CONTACT.email,
    ...(CONTACT.phoneE164 ? { telephone: CONTACT.phoneE164 } : {}),
    address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.locality, postalCode: a.postcode, addressCountry: 'GB' },
    hasMap: directionsHref(a),
    // Days only once the owner confirms them; until then search engines get no hours rather than wrong ones.
    ...(v.days.length ? { openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: v.days, opens: v.opens, closes: v.closes }] } : {}),
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Cash, Bank transfer',
  }
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pb-16 pt-6 lg:gap-16 lg:px-6 lg:pb-24 lg:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(business) }} />
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,46rem)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <VisitUs headingLevel="h1" />
        <BritainMap className="mx-auto w-[60%] max-w-[280px] lg:w-full lg:max-w-[300px]" />
      </div>
      <section aria-labelledby="before" className="hw-prose max-w-[46rem]">
        <h2 id="before">Before you come</h2>
        <ul>
          <li>Tell us which sofas you’d like to see when you book, and we’ll tell you what we can show you.</li>
          <li>Bring the measurements of your room and the narrowest door on the way in. Our <Link href="/will-it-fit">measuring guide</Link> shows how.</li>
          <li>A photo of your room helps when you’re choosing a fabric colour.</li>
        </ul>
        <p>
          Can’t get to {a.locality}? Everything can be done online or on WhatsApp, and <Link href="/fabric-samples">fabric samples</Link> come by post.
        </p>
      </section>
    </div>
  )
}
