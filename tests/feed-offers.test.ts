import { describe, expect, it } from 'vitest'
import { basketOfferAmount, classifyPaidLanding, offerEnds, offerToken, tierAmount, type TierAmounts } from '@/lib/offers/paid'
import { buildFeed, catalogueLink, feedAgent, googleFeedXml, itemDescription, metaFeedXml, priceBand, type FeedProductRow } from '@/lib/catalogue/feed'
import { adLink, META_URL_PARAMETERS, PROFILE_LINKS, profileLink, testAdLink } from '@/lib/admin/ad-links'
import { buildStatusChecks, type AdminStatusData, type StatusContext } from '@/lib/admin/status'
import { pricingPayload } from '@/lib/checkout/order'
import { tagsFrom } from '@/lib/tracking/browser'

const SITE = 'https://heartwellfurniture.co.uk'
const AMOUNTS: TierAmounts = { HIGH: 50, MID: 30, STANDARD: 20 }
const CLOUD = 'https://res.cloudinary.com/demo/image/upload/v1/heartwell'

function product(over: Partial<FeedProductRow> = {}): FeedProductRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'roma-3-seater',
    title: 'Roma 3 Seater Sofa',
    description: null,
    highlights: [],
    basePrice: 699,
    madeToOrder: false,
    madeInUk: false,
    material: 'Plush velvet',
    size: { width_cm: 210, depth_cm: 95, height_cm: 90, side_a_cm: null, side_b_cm: null },
    gallery: [`${CLOUD}/room.jpg`, `${CLOUD}/side.jpg`],
    axis1Value: '3 Seater',
    typeName: 'Sofa',
    googleCategory: 'Furniture > Sofas',
    metaCategory: 'Furniture > Sofas',
    rangeName: 'Roma',
    categoryPath: ['Sofas', 'Fabric sofas'],
    offerTier: 'HIGH',
    variants: [
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sku: 'ROMA-3-GREY', colourName: 'Grey', materialLabel: null, priceAdjustment: 0, image: `${CLOUD}/grey.jpg` },
      { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', sku: 'ROMA-3-NAVY', colourName: 'Navy', materialLabel: null, priceAdjustment: 50, image: `${CLOUD}/navy.jpg` },
    ],
    ...over,
  }
}

describe('ad landings', () => {
  it('knows a Meta ad, a catalogue ad and a Google ad', () => {
    expect(classifyPaidLanding('?utm_source=facebook&utm_medium=paid_social&utm_campaign=Autumn')).toBe('meta_ads')
    expect(classifyPaidLanding('utm_source=Instagram&utm_medium=Paid_Social')).toBe('meta_ads')
    expect(classifyPaidLanding('?variant=X&utm_source=facebook&utm_medium=paid_social&utm_campaign=catalogue')).toBe('meta_catalog')
    expect(classifyPaidLanding('?gclid=abc')).toBe('google_ads')
    expect(classifyPaidLanding('?utm_source=google&utm_medium=cpc')).toBe('google_ads')
  })

  it('never counts an ordinary visit or a shared Facebook link as an ad', () => {
    expect(classifyPaidLanding('')).toBeNull()
    expect(classifyPaidLanding('?fbclid=IwAR123')).toBeNull()
    expect(classifyPaidLanding('?utm_source=instagram&utm_medium=social&utm_campaign=bio')).toBeNull()
    expect(classifyPaidLanding('?utm_source=facebook')).toBeNull()
    expect(classifyPaidLanding('?utm_source=newsletter&utm_medium=paid_social')).toBeNull()
  })

  it('reads the last copy of a tag, so an ad’s URL parameters win over a catalogue link’s', () => {
    const catalogueThenAd = `${new URL(catalogueLink(`${SITE}/products/roma?variant=X`)).search}&${META_URL_PARAMETERS.replace('{{campaign.name}}', 'Autumn')}`
    expect(classifyPaidLanding(catalogueThenAd)).toBe('meta_ads')
    expect(tagsFrom(catalogueThenAd).campaign).toBe('Autumn')
    expect(tagsFrom('?utm_source=a&utm_source=&utm_source=b').source).toBe('b')
  })

  it('only trusts a well-formed offer token and a future end date', () => {
    expect(offerToken('3547044A-3CEE-407A-BD1B-F06A075E663F')).toBe('3547044a-3cee-407a-bd1b-f06a075e663f')
    expect(offerToken('not-a-token')).toBeNull()
    expect(offerToken(undefined)).toBeNull()
    const now = Date.parse('2026-10-08T12:00:00Z')
    expect(offerEnds('2026-10-15T12:00:00.000Z', now)?.toISOString()).toBe('2026-10-15T12:00:00.000Z')
    expect(offerEnds('2026-10-08T11:59:59.000Z', now)).toBeNull()
    expect(offerEnds('rubbish', now)).toBeNull()
  })
})

describe('offer amounts (shown as the database works them out)', () => {
  it('gives each tier its amount, and nothing when excluded or untiered', () => {
    expect(tierAmount('HIGH', AMOUNTS)).toBe(50)
    expect(tierAmount('STANDARD', AMOUNTS)).toBe(20)
    expect(tierAmount('EXCLUDED', AMOUNTS)).toBe(0)
    expect(tierAmount(null, AMOUNTS)).toBe(0)
  })

  it('takes one amount per basket, from its best tier, never more than the goods', () => {
    expect(basketOfferAmount([{ tier: 'STANDARD', lineTotal: 400 }, { tier: 'MID', lineTotal: 700 }], AMOUNTS)).toBe(30)
    expect(basketOfferAmount([{ tier: 'EXCLUDED', lineTotal: 400 }, { tier: null, lineTotal: 100 }], AMOUNTS)).toBe(0)
    expect(basketOfferAmount([{ tier: 'HIGH', lineTotal: 40 }], AMOUNTS)).toBe(40)
    expect(basketOfferAmount([], AMOUNTS)).toBe(0)
  })

  it('sends the offer token to the database with the basket, never a price', () => {
    const q = { items: [{ id: 'l1', variantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', materialId: null, quantity: 1 }], extras: { floor: 0, hasLift: false, assembly: false, removal: false, removalSeats: 3 } }
    expect(pricingPayload(q, 'tok')).toMatchObject({ offer_entitlement_token: 'tok', promotion_code: null })
    expect(pricingPayload(q)).toMatchObject({ offer_entitlement_token: null })
    expect(JSON.stringify(pricingPayload(q, 'tok'))).not.toMatch(/price/)
  })
})

describe('catalogue feed', () => {
  it('has one item per colourway, with the ID the Pixel sends and the product as its group', () => {
    const p = product()
    const { items, leftOut } = buildFeed([p], SITE)
    expect(leftOut).toEqual([])
    expect(items.map((i) => i.id)).toEqual(p.variants.map((v) => v.id))
    expect(items.every((i) => i.itemGroupId === p.id)).toBe(true)
    expect(items.map((i) => i.price)).toEqual([699, 749])
    expect(items[0]).toMatchObject({
      title: 'Roma 3 Seater Sofa, Grey',
      colour: 'Grey',
      material: 'Plush velvet',
      size: '3 Seater',
      productType: 'Sofas > Fabric sofas',
      link: `${SITE}/products/roma-3-seater?variant=ROMA-3-GREY`,
      customLabels: ['Roma', 'ready made', '500-749', 'offer high', 'sofa'],
    })
  })

  it('uses square 1080 photos and the gallery as extra images', () => {
    const [first] = buildFeed([product()], SITE).items
    expect(first!.imageLink).toBe('https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:F5F1EF,w_1080,h_1080,f_jpg,q_auto/v1/heartwell/grey.jpg')
    expect(first!.additionalImageLinks).toHaveLength(2)
    expect(first!.additionalImageLinks[0]).toContain('w_1080,h_1080')
  })

  it('leaves out a colour with no photo of its own, but lets a single colourway use the gallery', () => {
    const p = product({ variants: [{ ...product().variants[0]!, image: null }, product().variants[1]!] })
    const { items, leftOut } = buildFeed([p], SITE)
    expect(items.map((i) => i.colour)).toEqual(['Navy'])
    expect(items[0]!.itemGroupId).toBeNull()
    expect(leftOut).toEqual([{ productTitle: 'Roma 3 Seater Sofa', slug: 'roma-3-seater', sku: 'ROMA-3-GREY', colour: 'Grey', reason: 'no-photo' }])

    const single = buildFeed([product({ variants: [{ ...product().variants[0]!, image: null }] })], SITE)
    expect(single.items).toHaveLength(1)
    expect(single.items[0]!.imageLink).toContain('/room.jpg')
    expect(single.items[0]!.additionalImageLinks.join()).not.toContain('/room.jpg')

    const bare = buildFeed([product({ gallery: [], variants: [{ ...product().variants[0]!, image: null }] })], SITE)
    expect(bare.items).toEqual([])
    expect(bare.leftOut[0]!.reason).toBe('no-photo')
  })

  it('writes a plain description until the product has its own', () => {
    const p = product({ madeToOrder: true })
    const text = itemDescription(p, p.variants[0]!)
    expect(text).toMatch(/^Roma 3 Seater Sofa in Grey, Plush velvet\.\n\nSize: W 210 · D 95 · H 90 cm\./)
    expect(text).toContain('made to order')
    expect(text).toContain('Free delivery')
    expect(text).not.toMatch(/undefined|null/)
    expect(itemDescription(product({ description: 'Our own words.' }), p.variants[0]!)).toMatch(/^Our own words\./)
  })

  it('bands prices for product sets', () => {
    expect([149, 499.99, 500, 749, 750, 999, 1000, 1149].map(priceBand)).toEqual(['under 500', 'under 500', '500-749', '500-749', '750-999', '750-999', '1000 plus', '1000 plus'])
  })

  it('writes Meta’s XML with every required field, escaped, and links that mark a catalogue ad', () => {
    const p = product({ title: 'Roma & Co <3 Seater>', rangeName: 'Roma "Plush"' })
    const { items } = buildFeed([p], SITE)
    const xml = metaFeedXml(items, SITE)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
    expect(blocks).toHaveLength(2)
    for (const block of blocks) {
      for (const field of ['id', 'item_group_id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'google_product_category', 'shipping']) {
        expect(block).toContain(`<g:${field}>`)
      }
    }
    expect(xml).toContain('<g:availability>in stock</g:availability>')
    expect(xml).toContain('<g:price>699.00 GBP</g:price>')
    expect(xml).toContain('<g:brand>Heartwell</g:brand>')
    expect(xml).toContain('<g:title>Roma &amp; Co &lt;3 Seater&gt;, Grey</g:title>')
    expect(xml).toContain('<g:custom_label_0>Roma &quot;Plush&quot;</g:custom_label_0>')
    expect(xml).toContain('<g:shipping><g:country>GB</g:country>')
    // No bare ampersands anywhere: every & starts an entity.
    expect(xml.replace(/&(amp|lt|gt|quot|apos);/g, '')).not.toContain('&')
    const link = /<g:link>([^<]+)<\/g:link>/.exec(xml)![1]!.replace(/&amp;/g, '&')
    expect(link).toBe(`${SITE}/products/roma-3-seater?variant=ROMA-3-GREY&utm_source=facebook&utm_medium=paid_social&utm_campaign=catalogue`)
    expect(classifyPaidLanding(new URL(link).search)).toBe('meta_catalog')
  })

  it('never puts order details or private links in the feed', () => {
    const xml = metaFeedXml(buildFeed([product()], SITE).items, SITE)
    expect(xml).not.toMatch(/confirm-order|track-order|\/order\/|HW-1\d{5}/)
  })

  it('keeps a Google version ready (Google’s spellings, no Meta tags)', () => {
    const xml = googleFeedXml(buildFeed([product()], SITE).items, SITE)
    expect(xml).toContain('<g:availability>in_stock</g:availability>')
    expect(xml).toContain('<g:identifier_exists>no</g:identifier_exists>')
    expect(xml).not.toContain('fb_product_category')
    expect(xml).not.toContain('utm_')
  })

  it('knows Meta’s fetcher from anyone else', () => {
    expect(feedAgent('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe('meta')
    expect(feedAgent('meta-externalagent/1.1')).toBe('meta')
    expect(feedAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe('google')
    expect(feedAgent('Mozilla/5.0 (iPhone)')).toBe('other')
    expect(feedAgent(null)).toBe('other')
  })
})

describe('ad links', () => {
  it('marks every ad link as an ad, keeping the page’s own query', () => {
    const link = adLink(SITE, '/products/roma-3-seater?variant=ROMA-3-GREY', 'roma')
    expect(link).toBe(`${SITE}/products/roma-3-seater?variant=ROMA-3-GREY&utm_source=facebook&utm_medium=paid_social&utm_campaign=roma`)
    expect(classifyPaidLanding(new URL(link).search)).toBe('meta_ads')
  })

  it('gives Meta a parameter template it fills in', () => {
    expect(META_URL_PARAMETERS).toBe('utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}')
    expect(classifyPaidLanding(META_URL_PARAMETERS)).toBe('meta_ads')
  })

  it('makes a test link that shows the offer but never counts', () => {
    const q = new URL(testAdLink(SITE, '/sofas')).searchParams
    expect(q.get('qa')).toBe('1')
    expect(classifyPaidLanding(q.toString())).toBe('meta_ads')
  })

  it('never gives the ad offer through a profile link', () => {
    for (const l of PROFILE_LINKS) expect(classifyPaidLanding(new URL(profileLink(SITE, l.source, l.campaign)).search)).toBeNull()
  })
})

describe('status: the catalogue feed', () => {
  const ctx: StatusContext = {
    appEnv: 'staging',
    siteUrl: SITE,
    indexable: false,
    commit: 'abc1234',
    supabaseConfigured: true,
    secretKeyConfigured: true,
    smtpConfigured: true,
    addressLookupConfigured: true,
    photoUploadsConfigured: true,
    trackingConfigured: false,
  }
  const data: AdminStatusData = {
    database: { time: '2026-10-08T12:00:00Z', postgres: '17', migrations: 18, latest_migration: 'feed_offers' },
    catalogue: { products: 64, active_products: 64, variants: 105, categories: 9, materials: 70 },
    orders: { real: 0, test: 1, awaiting_confirmation: 0, latest: null },
    admins: 1,
    settings: {},
    cron: [],
    jobs: [],
    email: { last_sent: null, last_failed: null, failed_24h: 0 },
    conversions: { pending: 0, failed: 0, last_sent: null },
    orderflow: { enabled: false, configured: false, last_push: null },
  }
  const now = Date.parse('2026-10-08T12:00:00Z')
  const check = (lastFetched: string | null) => buildStatusChecks(ctx, data, null, { lastFetched, items: 82 }, now).find((c) => c.key === 'catalogue_feed')

  it('says when Meta hasn’t connected yet, has fetched recently, or has stopped', () => {
    expect(check(null)).toMatchObject({ level: 'warn' })
    expect(check('2026-10-08T11:05:00Z')).toMatchObject({ level: 'ok' })
    expect(check('2026-10-08T11:05:00Z')!.summary).toContain('82 items')
    expect(check('2026-10-07T08:00:00Z')).toMatchObject({ level: 'error' })
  })

  it('leaves the check out when the fetch record can’t be read', () => {
    expect(buildStatusChecks(ctx, data, null).some((c) => c.key === 'catalogue_feed')).toBe(false)
  })
})
