import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { VisitUs } from '@/components/home/VisitUs'
import { BRAND } from '@/config/brand'
import { CONTACT } from '@/config/contact'
import { SITE_URL } from '@/config/site'
import { jsonLdString } from '@/lib/product/seo'

// The page exists once the owner supplies the address (Phase 16); until then it's a 404, never a placeholder.
export const metadata: Metadata = {
  title: 'Visit us',
  alternates: { canonical: '/visit-us' },
}

export default function VisitUsPage() {
  const a = CONTACT.visitAddress
  if (!a) notFound()
  const business = {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: BRAND.name,
    url: SITE_URL,
    address: { '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.locality, postalCode: a.postcode, addressCountry: 'GB' },
    ...(CONTACT.phoneE164 ? { telephone: CONTACT.phoneE164 } : {}),
    ...(CONTACT.openingHours ? { openingHours: CONTACT.openingHours } : {}),
  }
  return (
    <div className="mx-auto flex max-w-[46rem] flex-col gap-6 px-4 pb-16 pt-6 lg:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(business) }} />
      <VisitUs headingLevel="h1" />
    </div>
  )
}
