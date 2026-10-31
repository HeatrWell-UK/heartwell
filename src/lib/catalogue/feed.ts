// The product feeds: Meta's catalogue (for catalogue ads) and Google's
// Merchant Center feed (free listings, switched on in Phase 20).
// Pure: the rows come in, items and XML come out; src/lib/catalogue/feed-load.ts
// reads the database.
//
// One item per colourway. Its ID is the colourway's (variant's) ID, the same
// ID the Pixel and the Conversions API send as content_ids, so Meta can match
// every view, add to basket and purchase to an item. Colourways of one
// product share item_group_id (the product's ID).
//
// A colourway without its own photo is left out rather than shown with a
// photo of another colour, unless it's the product's only colourway. The
// admin lists what's left out and why.
//
// Extra photos: the product's gallery, then the range's close-ups (audit A2,
// src/content/close-ups.ts) cut from the item's own colourway only.

import { BRAND } from '@/config/brand'
import { PROMISES } from '@/config/promises'
import { dimensionSummary, type SizeFields } from './display'
import { unitPrice } from './pricing'
import { squareImageUrl } from '@/lib/product/seo'
import { productHref } from '@/lib/product/helpers'
import { CATALOGUE_CAMPAIGN, META_AD_TAGS, type OfferTier } from '@/lib/offers/paid'
import { closeUpSources, feedCloseUps, type CloseUpPhoto } from '@/lib/product/close-ups'

export interface FeedVariantRow {
  id: string
  sku: string
  colourName: string | null
  materialLabel: string | null
  priceAdjustment: number
  image: string | null
}

export interface FeedProductRow {
  id: string
  slug: string
  title: string
  description: string | null
  highlights: string[]
  basePrice: number
  madeToOrder: boolean
  madeInUk: boolean
  /** The specification's material ("Plush velvet"), when a colourway doesn't name its own. */
  material: string | null
  size: SizeFields
  gallery: string[]
  /** "3 Seater", "Corner": the range's size option. */
  axis1Value: string | null
  typeName: string
  googleCategory: string | null
  metaCategory: string | null
  rangeName: string | null
  /** Its range's slug: the key to the range's close-ups. */
  rangeSlug: string | null
  /** Top level first: ["Sofas", "Corner sofas"]. */
  categoryPath: string[]
  offerTier: OfferTier | null
  variants: FeedVariantRow[]
}

export interface FeedItem {
  id: string
  itemGroupId: string | null
  title: string
  description: string
  price: number
  /** Product page for this colourway, without campaign tags. */
  link: string
  imageLink: string
  additionalImageLinks: string[]
  /**
   * Close-ups of this colourway. Meta wants every photo at least 500 px, so its
   * copy is enlarged to 1080; Google asks for photos at their own size.
   */
  closeUps: { meta: string; google: string }[]
  colour: string | null
  material: string | null
  size: string | null
  googleCategory: string | null
  metaCategory: string | null
  productType: string | null
  /** range · made to order · price band · offer tier · type, for product sets in Commerce Manager. */
  customLabels: [string, string, string, string, string]
  /** Its footprint and height in centimetres, for Google (product_width, product_length, product_height). */
  dimensions: { width: number | null; length: number | null; height: number | null }
  highlights: string[]
}

export type LeftOutReason = 'no-photo' | 'no-price'

export interface LeftOut {
  productTitle: string
  slug: string
  sku: string
  colour: string | null
  reason: LeftOutReason
}

export const LEFT_OUT_LABEL: Record<LeftOutReason, string> = {
  'no-photo': 'No photo of this colour',
  'no-price': 'No price',
}

const TITLE_MAX = 150
const DESCRIPTION_MAX = 5000
const EXTRA_IMAGES_MAX = 10

/** Price bands for product sets ("under 500" … "1000 plus"); pounds, inclusive lower bound. */
export function priceBand(price: number): string {
  if (price < 500) return 'under 500'
  if (price < 750) return '500-749'
  if (price < 1000) return '750-999'
  return '1000 plus'
}

const TIER_LABEL: Record<OfferTier, string> = { HIGH: 'offer high', MID: 'offer mid', STANDARD: 'offer standard', EXCLUDED: 'no offer' }

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)

// Google's limits for product_highlight.
const HIGHLIGHTS_MAX = 10
const HIGHLIGHT_MAX = 150

/**
 * The space it takes, as Google asks for it: width across the back, length
 * front to back (a straight sofa's depth, a corner's shorter side, a U-shape's
 * longer side), and height. Read the same way as the drawings on its page
 * (src/lib/product/measurements.ts).
 */
export function footprint(s: SizeFields): FeedItem['dimensions'] {
  const { width_cm: w, depth_cm: d, height_cm: h, side_a_cm: a, side_b_cm: b } = s
  if (a && b && w && w > Math.max(a, b)) return { width: w, length: Math.max(a, b), height: h }
  if (a && b) return { width: Math.max(a, b), length: Math.min(a, b), height: h }
  return { width: w, length: d, height: h }
}

function itemTitle(p: FeedProductRow, v: FeedVariantRow): string {
  const option = [v.colourName, v.materialLabel].filter(Boolean).join(' ')
  return clip(option ? `${p.title}, ${option}` : p.title, TITLE_MAX)
}

/**
 * The product's own description when it has one; until then (Phase 17C) a
 * plain, factual one from its details and the shop's promises.
 */
export function itemDescription(p: FeedProductRow, v: FeedVariantRow): string {
  const own = p.description?.trim()
  const lines: string[] = []
  if (own) lines.push(own)
  else {
    const colour = [v.colourName, v.materialLabel ?? p.material].filter(Boolean).join(', ')
    lines.push(`${p.title}${colour ? ` in ${colour}` : ''}.`)
    const size = dimensionSummary(p.size)
    if (size) lines.push(`Size: ${size}.`)
  }
  if (p.highlights.length) lines.push(p.highlights.map((h) => `• ${h}`).join('\n'))
  if (p.madeToOrder) lines.push(PROMISES.madeToOrder.long)
  lines.push(`${PROMISES.delivery.long} ${PROMISES.payment.long}`)
  return clip(lines.join('\n\n'), DESCRIPTION_MAX)
}

/** Feed items for every colourway that can be shown, and what was left out. */
export function buildFeed(products: FeedProductRow[], siteUrl: string): { items: FeedItem[]; leftOut: LeftOut[] } {
  const items: FeedItem[] = []
  const leftOut: LeftOut[] = []
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const photosOf = (slug: string): CloseUpPhoto[] =>
    (bySlug.get(slug)?.variants ?? []).flatMap((v) => (v.image ? [{ colour: v.colourName, material: v.materialLabel, src: v.image }] : []))
  for (const p of products) {
    const ready: FeedItem[] = []
    const sources = closeUpSources(p.rangeSlug, p.slug, photosOf)
    for (const v of p.variants) {
      const price = unitPrice(p.basePrice, v.priceAdjustment)
      const photo = v.image ?? (p.variants.length === 1 ? (p.gallery[0] ?? null) : null)
      const skip = (reason: LeftOutReason) => leftOut.push({ productTitle: p.title, slug: p.slug, sku: v.sku, colour: v.colourName, reason })
      if (!photo) {
        skip('no-photo')
        continue
      }
      if (!(price > 0)) {
        skip('no-price')
        continue
      }
      const extra = p.gallery.filter((g) => g !== photo).slice(0, EXTRA_IMAGES_MAX)
      const shown = { colour: v.colourName, material: v.materialLabel }
      const meta = feedCloseUps(sources, shown, () => 'c_scale,w_1080,f_jpg,q_auto')
      const google = feedCloseUps(sources, shown, () => 'f_jpg,q_auto')
      ready.push({
        id: v.id,
        itemGroupId: p.id,
        title: itemTitle(p, v),
        description: itemDescription(p, v),
        price,
        link: `${siteUrl}${productHref(p.slug, v.sku)}`,
        imageLink: squareImageUrl(photo),
        additionalImageLinks: extra.map(squareImageUrl),
        closeUps: meta.slice(0, EXTRA_IMAGES_MAX - extra.length).map((m, n) => ({ meta: m, google: google[n]! })),
        colour: v.colourName,
        material: v.materialLabel ?? p.material,
        size: p.axis1Value,
        googleCategory: p.googleCategory,
        metaCategory: p.metaCategory,
        productType: p.categoryPath.length ? p.categoryPath.join(' > ') : null,
        customLabels: [
          clip(p.rangeName ?? p.title, 100),
          p.madeToOrder ? 'made to order' : 'ready made',
          priceBand(price),
          p.offerTier ? TIER_LABEL[p.offerTier] : 'no offer',
          clip(p.typeName.toLowerCase(), 100),
        ],
        dimensions: footprint(p.size),
        highlights: p.highlights.slice(0, HIGHLIGHTS_MAX).map((h) => clip(h, HIGHLIGHT_MAX)),
      })
    }
    // Meta groups colourways by item_group_id; a product with one item in the feed has no group.
    if (ready.length === 1) ready[0]!.itemGroupId = null
    items.push(...ready)
  }
  return { items, leftOut }
}

export type FeedName = 'meta' | 'google'
export type FeedAgent = 'meta' | 'google' | 'other'

/** Who is fetching, from the user agent: Meta's and Google's fetchers name themselves. */
export function feedAgent(userAgent: string | null): FeedAgent {
  const ua = userAgent ?? ''
  if (/facebookexternalhit|facebookcatalog|facebot|meta-externalagent|meta-externalfetcher/i.test(ua)) return 'meta'
  if (/google/i.test(ua)) return 'google'
  return 'other'
}

// XML ------------------------------------------------------------------------

const escapeXml = (s: string) =>
  s
    // Characters XML 1.0 can't carry at all.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const tag = (name: string, value: string | null | undefined) => (value ? `<g:${name}>${escapeXml(value)}</g:${name}>` : '')
const money = (n: number) => `${n.toFixed(2)} GBP`

/** The product link with the catalogue's tags, so a visit from a catalogue ad is known (and gets the ad offer). */
export function catalogueLink(link: string): string {
  const url = new URL(link)
  url.searchParams.set('utm_source', META_AD_TAGS.utm_source)
  url.searchParams.set('utm_medium', META_AD_TAGS.utm_medium)
  url.searchParams.set('utm_campaign', CATALOGUE_CAMPAIGN)
  return url.toString()
}

function rss(items: string[], siteUrl: string, title: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml(BRAND.shortDescription)}</description>`,
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}

// No shipping element (17 October 2026): delivery is free to most of mainland
// Britain but charged in a few postcode areas (delivery_areas), which a feed
// can't say per postcode. Merchant Center takes it from its own settings.

/** Meta's catalogue feed (RSS 2.0 with Google's namespace, which Meta reads). */
export function metaFeedXml(items: FeedItem[], siteUrl: string): string {
  return rss(
    items.map((i) =>
      [
        '<item>',
        tag('id', i.id),
        tag('item_group_id', i.itemGroupId),
        tag('title', i.title),
        tag('description', i.description),
        tag('availability', 'in stock'),
        tag('condition', 'new'),
        tag('price', money(i.price)),
        tag('link', catalogueLink(i.link)),
        tag('image_link', i.imageLink),
        ...i.additionalImageLinks.map((src) => tag('additional_image_link', src)),
        ...i.closeUps.map((c) => tag('additional_image_link', c.meta)),
        tag('brand', BRAND.name),
        tag('color', i.colour),
        tag('material', i.material),
        tag('size', i.size),
        tag('google_product_category', i.googleCategory),
        // Meta reads Google's categories too. Its own field takes only Meta's own
        // names, so a copy of Google's wording there is rejected on every item
        // (Commerce Manager warning, 26 October 2026): sent only when it differs.
        i.metaCategory && i.metaCategory !== i.googleCategory ? tag('fb_product_category', i.metaCategory) : '',
        tag('product_type', i.productType),
        ...i.customLabels.map((label, n) => tag(`custom_label_${n}`, label)),
        '</item>',
      ]
        .filter(Boolean)
        .join(''),
    ),
    siteUrl,
    `${BRAND.name} catalogue`,
  )
}

const centimetres = (n: number | null) => (n && n > 0 ? `${Math.round(n)} cm` : null)

/** Google Merchant Center's feed (switched on in Phase 20; delivery comes from Merchant Center's settings). */
export function googleFeedXml(items: FeedItem[], siteUrl: string): string {
  return rss(
    items.map((i) =>
      [
        '<item>',
        tag('id', i.id),
        tag('item_group_id', i.itemGroupId),
        tag('title', i.title),
        tag('description', i.description),
        tag('availability', 'in_stock'),
        tag('condition', 'new'),
        tag('price', money(i.price)),
        tag('link', i.link),
        tag('image_link', i.imageLink),
        ...i.additionalImageLinks.map((src) => tag('additional_image_link', src)),
        ...i.closeUps.map((c) => tag('additional_image_link', c.google)),
        tag('brand', BRAND.name),
        // Made for us under our own name: there's no barcode or maker's part number.
        tag('identifier_exists', 'no'),
        tag('color', i.colour),
        tag('material', i.material),
        tag('size', i.size),
        tag('product_width', centimetres(i.dimensions.width)),
        tag('product_length', centimetres(i.dimensions.length)),
        tag('product_height', centimetres(i.dimensions.height)),
        ...i.highlights.map((h) => tag('product_highlight', h)),
        tag('google_product_category', i.googleCategory),
        tag('product_type', i.productType),
        ...i.customLabels.map((label, n) => tag(`custom_label_${n}`, label)),
        '</item>',
      ]
        .filter(Boolean)
        .join(''),
    ),
    siteUrl,
    `${BRAND.name} products`,
  )
}
