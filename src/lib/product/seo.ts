// Search and sharing for product pages: structured data (no ratings until real
// reviews exist, never invented ones), a share image and a plain description.

import { BRAND } from '@/config/brand'
import { PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import { fromPrice, unitPrice } from '@/lib/catalogue/pricing'
import { productHref } from './helpers'
import type { ProductPageData } from './types'

const CLOUDINARY_PLAIN = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/

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
  const colourText = colours.length ? ` in ${colours.length > 1 ? `${colours.slice(0, -1).join(', ')} or ${colours.at(-1)}` : colours[0]}` : ''
  const made = p.madeToOrder ? ' Made to order.' : ''
  return `${p.title}${colourText}, ${formatPrice(productPrice(p))}.${made} ${PROMISES.delivery.short}. ${PROMISES.payment.short}: cash or bank transfer on delivery.`
}

/** JSON for a <script type="application/ld+json">, safe to inline. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function productJsonLd(p: ProductPageData, siteUrl: string) {
  const url = `${siteUrl}/products/${p.slug}`
  const availability = p.madeToOrder ? 'https://schema.org/MadeToOrder' : 'https://schema.org/InStock'
  const images = [...p.variants.map((v) => v.image), ...p.gallery].filter((x): x is string => Boolean(x))
  return {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name: p.title,
    url,
    productGroupID: p.slug,
    description: productDescription(p),
    brand: { '@type': 'Brand', name: BRAND.name },
    ...(images.length ? { image: [...new Set(images)] } : {}),
    variesBy: ['https://schema.org/color'],
    hasVariant: p.variants.map((v) => ({
      '@type': 'Product',
      name: v.colourName ? `${p.title}, ${v.colourName}` : p.title,
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
