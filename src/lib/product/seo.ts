// Search and sharing for product pages: structured data (no ratings until real
// reviews exist, never invented ones), a share image and a plain description.

import { BRAND } from '@/config/brand'
import { CONTACT } from '@/config/contact'
import { POLICIES, PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import { fromPrice, unitPrice } from '@/lib/catalogue/pricing'
import { productHref } from './helpers'
import type { ProductPageData } from './types'

const CLOUDINARY_PLAIN = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/

/**
 * A 1080×1080 square for catalogue ads, the whole piece kept in frame on the
 * shop's stone background. Links that already carry a transformation are
 * left alone.
 */
export function squareImageUrl(src: string): string {
  const m = CLOUDINARY_PLAIN.exec(src)
  return m ? `${m[1]}c_pad,b_rgb:F5F1EF,w_1080,h_1080,f_jpg,q_auto/${m[2]}` : src
}

/** A 1200×630 share image (Facebook, WhatsApp, iMessage) cut from a product photo. */
export function shareImageUrl(src: string | null): string | null {
  if (!src) return null
  const m = CLOUDINARY_PLAIN.exec(src)
  return m ? `${m[1]}c_pad,b_rgb:F5F1EF,w_1200,h_630,f_jpg,q_auto/${m[2]}` : src
}

export function productPrice(p: ProductPageData): number {
  return fromPrice(p.basePrice, p.variants.map((v) => v.priceAdjustment))
}

/** The meta description until Phase 17C writes one per product. */
export function productDescription(p: ProductPageData): string {
  if (p.seoDescription) return p.seoDescription
  const colours = p.variants.map((v) => v.colourName).filter(Boolean)
  const made = p.madeToOrder ? ' Made to order.' : ''
  const text = (colourText: string) =>
    `${p.title}${colourText}, ${formatPrice(productPrice(p))}.${made} ${PROMISES.delivery.brief}. ${PROMISES.payment.short}: cash or bank transfer on delivery.`
  // Google shows about 160 characters, so a long colour list becomes a count
  // rather than cutting off how paying works at the end.
  const options = colours.length > 1
    ? [` in ${colours.slice(0, -1).join(', ')} or ${colours.at(-1)}`, ` in ${colours.length} colours`]
    : [colours.length ? ` in ${colours[0]}` : '']
  return options.map(text).find((t) => t.length <= DESCRIPTION_MAX) ?? text(options.at(-1)!)
}

/** About what Google shows of a meta description. */
export const DESCRIPTION_MAX = 160

/** JSON for a <script type="application/ld+json">, safe to inline. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

// No shippingDetails on the offers (17 October 2026): delivery is free to most
// of mainland Britain but charged in a few postcode areas (delivery_areas), and
// one "free to GB" claim would be wrong there. Google takes delivery costs from
// Merchant Center's settings, by postcode (docs/MERCHANT-CENTER.md).

/** Ready-made: 14 days to change your mind, return at the customer's cost. Made to order: exempt. */
export function returnPolicy(madeToOrder: boolean) {
  return madeToOrder
    ? { '@type': 'MerchantReturnPolicy', applicableCountry: 'GB', returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted' }
    : {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'GB',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: POLICIES.changeOfMindDays,
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      }
}

export function productJsonLd(p: ProductPageData, siteUrl: string) {
  const url = `${siteUrl}/products/${p.slug}`
  // Made-to-order pieces are on sale now and arrive in the same delivery window,
  // so they're in stock, as the Meta and Google feeds say. Google rejects
  // schema.org/MadeToOrder (Rich Results Test, 17 October 2026); the return
  // policy below is what tells it they're made to order.
  const availability = 'https://schema.org/InStock'
  const returns = returnPolicy(p.madeToOrder)
  const images = [...p.variants.map((v) => v.image), ...p.gallery].filter((x): x is string => Boolean(x))
  const description = productDescription(p)
  return {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name: p.title,
    url,
    productGroupID: p.slug,
    description,
    brand: { '@type': 'Brand', name: BRAND.name },
    ...(images.length ? { image: [...new Set(images)] } : {}),
    // Ratings only from real, approved reviews: nothing at all until the first one.
    ...(p.reviewStats
      ? {
          aggregateRating: { '@type': 'AggregateRating', ratingValue: p.reviewStats.average.toFixed(1), reviewCount: p.reviewStats.count, bestRating: 5, worstRating: 1 },
          review: p.reviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.name },
            datePublished: r.date.slice(0, 10),
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            ...(r.title ? { name: r.title } : {}),
            ...(r.comment ? { reviewBody: r.comment } : {}),
          })),
        }
      : {}),
    variesBy: ['https://schema.org/color'],
    hasVariant: p.variants.map((v) => ({
      '@type': 'Product',
      name: v.colourName ? `${p.title}, ${v.colourName}` : p.title,
      description,
      sku: v.sku,
      ...(v.colourName ? { color: v.colourName } : {}),
      ...(v.image ? { image: v.image } : {}),
      offers: {
        '@type': 'Offer',
        url: `${siteUrl}${productHref(p.slug, v.sku)}`,
        price: unitPrice(p.basePrice, v.priceAdjustment).toFixed(2),
        priceCurrency: 'GBP',
        availability,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: BRAND.name },
        hasMerchantReturnPolicy: returns,
      },
    })),
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: `${siteUrl}${item.path}` })),
  }
}

const postalAddress = (a: NonNullable<typeof CONTACT.visitAddress>) => ({
  '@type': 'PostalAddress',
  streetAddress: a.street,
  addressLocality: a.locality,
  addressRegion: a.county,
  postalCode: a.postcode,
  addressCountry: 'GB',
})

/**
 * The shop's return policy, for Google: ${POLICIES.changeOfMindDays} days on ready-made pieces,
 * the customer paying the return. Each made-to-order product overrides it on
 * its own page (no change-of-mind returns).
 */
export function shopReturnPolicy(siteUrl: string) {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'GB',
    returnPolicyCountry: 'GB',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: POLICIES.changeOfMindDays,
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    refundType: 'https://schema.org/FullRefund',
    merchantReturnLink: `${siteUrl}/delivery-and-returns`,
  }
}

/** Who runs the shop, for search engines: name, logo, contact, address, profiles and return policy (each only once set). */
export function organizationJsonLd(siteUrl: string) {
  const a = CONTACT.visitAddress
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${siteUrl}/#organization`,
    name: BRAND.name,
    alternateName: BRAND.alternateNames,
    ...(CONTACT.trading.companyName ? { legalName: CONTACT.trading.companyName } : {}),
    url: siteUrl,
    logo: `${siteUrl}/brand/hw-logo.webp`,
    description: BRAND.shortDescription,
    email: CONTACT.email,
    ...(CONTACT.phoneE164 ? { telephone: CONTACT.phoneE164 } : {}),
    ...(a ? { address: postalAddress(a) } : {}),
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
    ...(CONTACT.socials.length ? { sameAs: CONTACT.socials.map((s) => s.url) } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: CONTACT.email,
      ...(CONTACT.phoneE164 ? { telephone: CONTACT.phoneE164 } : {}),
      areaServed: 'GB',
      availableLanguage: 'en-GB',
    },
    hasMerchantReturnPolicy: shopReturnPolicy(siteUrl),
    // The Burnley showroom (Visit us).
    ...(a ? { location: { '@id': `${siteUrl}/visit-us#store` } } : {}),
  }
}

/** The site itself, so Google shows "Heartwell" as the site's name in results. */
export function websiteJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: BRAND.name,
    alternateName: BRAND.alternateNames,
    url: `${siteUrl}/`,
    inLanguage: 'en-GB',
    publisher: { '@id': `${siteUrl}/#organization` },
  }
}

/** The showroom, for local searches ("sofa shop Burnley"): address, map position and opening hours. */
export function storeJsonLd(siteUrl: string, mapHref: string) {
  const a = CONTACT.visitAddress
  if (!a) return null
  const v = CONTACT.visit
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${siteUrl}/visit-us#store`,
    name: `${BRAND.name} showroom`,
    url: `${siteUrl}/visit-us`,
    image: `${siteUrl}/opengraph-image.jpg`,
    description: `See and sit on ${BRAND.name} sofas and feel the fabrics, by appointment.`,
    email: CONTACT.email,
    ...(CONTACT.phoneE164 ? { telephone: CONTACT.phoneE164 } : {}),
    address: postalAddress(a),
    geo: { '@type': 'GeoCoordinates', latitude: a.geo.latitude, longitude: a.geo.longitude },
    hasMap: mapHref,
    // Days only once the owner confirms them; until then search engines get no hours rather than wrong ones.
    ...(v.days.length ? { openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: v.days, opens: v.opens, closes: v.closes }] } : {}),
    priceRange: '££',
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Cash, Bank transfer',
    parentOrganization: { '@id': `${siteUrl}/#organization` },
  }
}
