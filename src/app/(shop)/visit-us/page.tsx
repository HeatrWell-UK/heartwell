import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { addressLine, directionsHref, VisitUs } from '@/components/home/VisitUs'
import { BRAND } from '@/config/brand'
import { CONTACT, visitHoursText } from '@/config/contact'
import { SITE_URL } from '@/config/site'
import { jsonLdString, storeJsonLd } from '@/lib/product/seo'
import { BritainMap } from '@/components/content/BritainMap'
import { getDeliveryInfo } from '@/lib/product/load'
import { deliveryDaysText } from '@/lib/delivery/window'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

// The page exists only while there's an address (src/config/contact.ts); without one it's a 404, never a placeholder.
const a = CONTACT.visitAddress

// Written for "sofa shop Burnley" and "sofa showroom Lancashire" (docs/KEYWORDS.md).
export const metadata: Metadata = {
  title: a ? `Sofa showroom in ${a.locality}, ${a.county}` : 'Visit us',
  description: a
    ? `See and sit on ${BRAND.name} sofas at our ${a.locality} showroom, ${addressLine(a)}. ${visitHoursText()}, by appointment. Pay on delivery.`
    : undefined,
  alternates: { canonical: '/visit-us' },
}

export const revalidate = 300

export default async function VisitUsPage() {
  if (!a) notFound()
  const delivery = SUPABASE_CONFIGURED ? await getDeliveryInfo().catch(() => null) : null
  const business = storeJsonLd(SITE_URL, directionsHref(a))
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
          Can’t get to {a.locality}? You can order online at any time, day or night, or on WhatsApp, and <Link href="/fabric-samples">fabric samples</Link> come
          by post. {delivery ? deliveryDaysText(delivery.noDeliveryDays) : null}
        </p>
      </section>
    </div>
  )
}
