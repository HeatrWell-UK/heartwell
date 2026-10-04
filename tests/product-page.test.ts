import { describe, expect, it } from 'vitest'
import { backOptions, checkFit, pickFabric, pickVariant, postcodeOutcome, productHref, sizeOptions } from '@/lib/product/helpers'
import { measurementLayout } from '@/lib/product/measurements'
import { specRows } from '@/lib/product/specs'
import { jsonLdString, productJsonLd, shareImageUrl } from '@/lib/product/seo'
import { fromPrice, unitPrice } from '@/lib/catalogue/pricing'
import type { ProductPageData, SiblingView, VariantView } from '@/lib/product/types'

const variant = (sku: string, colourName: string | null, extra: Partial<VariantView> = {}): VariantView => ({
  id: `id-${sku}`,
  sku,
  colourName,
  colourHex: null,
  materialLabel: null,
  priceAdjustment: 0,
  image: `https://res.cloudinary.com/demo/image/upload/v1/${sku}.png`,
  ...extra,
})

const sibling = (slug: string, size: string, back: string | null, colours: string[], price = 500): SiblingView => ({
  slug,
  axis1Value: size,
  axis2Value: back,
  basePrice: price,
  madeToOrder: true,
  variants: colours.map((c, i) => ({ sku: `${slug}-${i}`, colourName: c, priceAdjustment: 0 })),
})

describe('prices', () => {
  it('adds the colourway adjustment and fabric surcharge', () => {
    expect(unitPrice(749, 0, 0)).toBe(749)
    expect(unitPrice(749, -50, 12.5)).toBe(711.5)
    expect(fromPrice(499, [20, -10, 0])).toBe(489)
    expect(fromPrice(499, [])).toBe(499)
  })
})

describe('choosing what the page opens on', () => {
  const variants = [variant('NO-PHOTO', 'Grey', { image: null }), variant('RR-GFM Fabric', 'Brown')]

  it('opens on the colourway in the address, by SKU (any case) or ID', () => {
    expect(pickVariant(variants, 'rr-gfm fabric')?.sku).toBe('RR-GFM Fabric')
    expect(pickVariant(variants, 'id-NO-PHOTO')?.sku).toBe('NO-PHOTO')
  })

  it('otherwise opens on the first colourway with a photo', () => {
    expect(pickVariant(variants, undefined)?.sku).toBe('RR-GFM Fabric')
    expect(pickVariant(variants, 'nonsense')?.sku).toBe('RR-GFM Fabric')
    expect(pickVariant([], undefined)).toBeNull()
  })

  it('finds a fabric by its code', () => {
    const collections = [{ slug: 'c', name: 'Chenille', surcharge: 0, fabrics: [{ id: 'f1', code: 'CH01', name: 'Cream', hex: null, image: null }] }]
    expect(pickFabric(collections, 'ch01')?.fabric.name).toBe('Cream')
    expect(pickFabric(collections, 'XX99')).toBeNull()
    expect(pickFabric(collections, undefined)).toBeNull()
  })

  it('builds addresses with the colour and fabric, encoding spaces', () => {
    expect(productHref('sample')).toBe('/products/sample')
    expect(productHref('sample', 'RR-GFM Fabric', 'PL09')).toBe('/products/sample?variant=RR-GFM+Fabric&fabric=PL09')
  })
})

describe('size and back style links', () => {
  const siblings = [
    sibling('r-2-high', '2 Seater', 'High Back', ['Grey', 'Black'], 499),
    sibling('r-2-scatter', '2 Seater', 'Scattered Back', ['Grey'], 499),
    sibling('r-3-high', '3 Seater', 'High Back', ['Black'], 599),
    sibling('r-corner-scatter', 'Corner', 'Scattered Back', ['Grey'], 749),
  ]

  it('links each size in the current back style when it exists, otherwise in the one it comes in', () => {
    const sizes = sizeOptions(siblings, 'r-2-high', 'Grey', null)
    expect(sizes.map((s) => [s.label, s.href, s.current])).toEqual([
      ['2 Seater', '/products/r-2-high?variant=r-2-high-0', true],
      ['3 Seater', '/products/r-3-high', false], // no grey 3 seater: opens on its own colour
      ['Corner', '/products/r-corner-scatter?variant=r-corner-scatter-0', false],
    ])
    expect(sizes.map((s) => s.price)).toEqual([499, 599, 749])
  })

  it('carries a chosen fabric to made-to-order pieces', () => {
    expect(sizeOptions(siblings, 'r-2-high', null, 'PL09')[1]!.href).toBe('/products/r-3-high?fabric=PL09')
  })

  it('offers back styles only where the size comes in more than one', () => {
    expect(backOptions(siblings, 'r-2-high', 'Grey', null).map((b) => [b.label, b.current])).toEqual([
      ['High Back', true],
      ['Scattered Back', false],
    ])
    expect(backOptions(siblings, 'r-3-high', null, null)).toEqual([])
    expect(sizeOptions([siblings[0]!], 'r-2-high', null, null)).toEqual([])
  })
})

describe('will it fit', () => {
  it('compares the door with the smaller of depth and height', () => {
    expect(checkFit(80, { depth_cm: 94, height_cm: 97 })).toEqual({ kind: 'no', needed: 94, door: 80 })
    expect(checkFit(96, { depth_cm: 94, height_cm: 97 })).toEqual({ kind: 'tight', needed: 94, door: 96 })
    expect(checkFit(100, { depth_cm: 94, height_cm: 97 })).toEqual({ kind: 'fits', needed: 94, door: 100 })
    expect(checkFit(80, { depth_cm: null, height_cm: 75 })).toEqual({ kind: 'fits', needed: 75, door: 80 })
  })

  it('says when it can’t tell', () => {
    expect(checkFit(80, { depth_cm: null, height_cm: null })).toEqual({ kind: 'unknown' })
    for (const bad of [NaN, 0, 39, 251]) expect(checkFit(bad, { depth_cm: 90, height_cm: 90 })).toEqual({ kind: 'invalid' })
  })
})

describe('postcode check', () => {
  it('answers free delivery for UK Mainland', () => {
    expect(postcodeOutcome('ls62ab')).toEqual({ kind: 'free', area: 'LS6', postcode: 'LS6 2AB' })
  })

  it('sends islands and Northern Ireland to a quote, naming the place', () => {
    expect(postcodeOutcome('BT1 1AA')).toMatchObject({ kind: 'quote', place: 'Northern Ireland' })
    expect(postcodeOutcome('PO30 1AA')).toMatchObject({ kind: 'quote', place: 'the Isle of Wight' })
    expect(postcodeOutcome('HS1 2AA')).toMatchObject({ kind: 'quote', place: 'the Scottish islands' })
  })

  it('says when it depends on the address, and catches typos', () => {
    expect(postcodeOutcome('PA34 4AA')).toMatchObject({ kind: 'depends', area: 'PA34' })
    expect(postcodeOutcome('LS6')).toEqual({ kind: 'invalid' })
    expect(postcodeOutcome('   ')).toEqual({ kind: 'empty' })
  })
})

describe('measurements', () => {
  const none = { width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null }
  it('chooses the drawing from the shape and sizes', () => {
    expect(measurementLayout('straight', { ...none, width_cm: 198, depth_cm: 94 }, [])).toEqual({ kind: 'straight', w: 198, d: 94 })
    expect(measurementLayout('corner', { ...none, width_cm: 240, side_a_cm: 190, side_b_cm: 240, depth_cm: 95 }, [])).toEqual({
      kind: 'corner',
      top: 240,
      left: 190,
      d: 95,
    })
    expect(measurementLayout('u-shape', { ...none, width_cm: 300, side_a_cm: 240, side_b_cm: 180 }, [])).toEqual({
      kind: 'u',
      back: 300,
      left: 240,
      right: 180,
      d: null,
    })
    const pieces = [
      { label: '3 Seater', width_cm: 198, depth_cm: 94, height_cm: 97 },
      { label: '2 Seater', width_cm: 168, depth_cm: 94, height_cm: 97 },
    ]
    expect(measurementLayout('set', { ...none, width_cm: 198 }, pieces)).toMatchObject({ kind: 'set', pieces: [{ w: 198 }, { w: 168 }] })
    expect(measurementLayout('footstool', none, [])).toBeNull()
  })
})

describe('specifications', () => {
  it('labels fields by product type, shows only true features and skips pieces', () => {
    const fields = [
      { key: 'shape', label: 'Shape', kind: 'text' },
      { key: 'seats', label: 'Seats', kind: 'number' },
      { key: 'usb_ports', label: 'USB ports', kind: 'boolean' },
      { key: 'storage', label: 'Storage', kind: 'boolean' },
      { key: 'pieces', label: 'Pieces', kind: 'pieces' },
    ]
    expect(specRows(fields, { shape: 'corner', seats: 5, usb_ports: true, storage: false, pieces: [] }, { madeToOrder: true, madeInUk: true })).toEqual([
      { label: 'Shape', value: 'Corner sofa' },
      { label: 'Seats', value: '5' },
      { label: 'USB ports', value: 'Yes' },
      { label: 'Made to order', value: 'Yes, in the colour shown or any of our fabrics' },
      { label: 'Made in', value: 'The UK' },
    ])
  })
})

describe('search and sharing', () => {
  it('cuts a 1200×630 share image from a plain Cloudinary photo', () => {
    expect(shareImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a/b.png')).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:F5F1EF,w_1200,h_630,f_jpg,q_auto/v1/a/b.png',
    )
    expect(shareImageUrl(null)).toBeNull()
  })

  it('describes every colourway with its own price, and never a rating', () => {
    const p = {
      slug: 'sample-corner',
      title: 'Sample Corner',
      basePrice: 749,
      madeToOrder: true,
      variants: [variant('S-G', 'Grey'), variant('S-B', 'Black', { priceAdjustment: 20 })],
      gallery: [],
      seoDescription: null,
    } as unknown as ProductPageData
    const data = productJsonLd(p, 'https://example.test')
    expect(data['@type']).toBe('ProductGroup')
    expect(data.hasVariant.map((v) => [v.sku, v.offers.price, v.offers.availability])).toEqual([
      ['S-G', '749.00', 'https://schema.org/MadeToOrder'],
      ['S-B', '769.00', 'https://schema.org/MadeToOrder'],
    ])
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue/)
    expect(jsonLdString({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}')
  })
})
