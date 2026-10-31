import { describe, expect, it } from 'vitest'
import { areaInSentence, coverAnswer, deliveryAnswer, faqJsonLd, fitAnswer, listingSize, materialWords, productQuestions, rangeQuestions, sizeAnswer } from '@/lib/seo/answers'
import { categoryQuestions } from '@/content/categories'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import type { RangeSummary } from '@/lib/catalogue/listing'
import type { DeliveryInfo, ProductPageData, VariantView } from '@/lib/product/types'
import { POLICIES } from '@/config/promises'

const DELIVERY: DeliveryInfo = {
  day: '2026-10-16',
  settings: { delivery_min_working_days: 2, delivery_max_working_days: 4, preferred_date_min_days: 3, preferred_date_max_days: 30, no_delivery_days: [1] },
  windowLabel: 'Tue 20 – Thu 22 October',
  minDays: 2,
  maxDays: 4,
  upstairsFirstFloor: 25,
  upstairsPerExtraFloor: 15,
  assemblyFee: 30,
  removalPerSeat: 10,
  areas: [
    { slug: 'devon', name: 'Devon', places: 'Exeter', charge: 40, minWorkingDays: 5, maxWorkingDays: 7, districts: ['EX1'], windowLabel: '', earliestDate: '' },
    { slug: 'far-north', name: 'Far north of Scotland', places: 'Thurso', charge: 100, minWorkingDays: 5, maxWorkingDays: 7, districts: ['KW1'], windowLabel: '', earliestDate: '' },
  ],
  noDeliveryDays: [1],
}

const variant = (colourName: string, materialLabel: string | null = null): VariantView => ({
  id: colourName,
  sku: colourName,
  colourName,
  colourHex: null,
  materialLabel,
  priceAdjustment: 0,
  image: null,
})

const piece = (over: Partial<ProductPageData> = {}) =>
  ({
    title: 'Verona 5 Seater Corner High Back',
    typeName: 'Sofa',
    shape: 'corner',
    dimensions: { width_cm: 240, depth_cm: 95, height_cm: 90, side_a_cm: 240, side_b_cm: 240 },
    pieces: [],
    dimensionsNote: null,
    variants: [variant('Grey', 'Plush Velvet')],
    specs: [{ label: 'Material', value: 'Fabric' }],
    madeToOrder: true,
    madeInUk: true,
    ...over,
  }) as unknown as ProductPageData

const listed = (slug: string, over: Partial<ListingProduct> = {}): ListingProduct => ({
  slug,
  title: slug,
  typeSlug: 'sofa',
  typeName: 'Sofa',
  typeFilters: [],
  rangeSlug: 'verona',
  rangeName: 'Verona',
  rangeDescription: null,
  rangeSort: 1,
  sort: 1,
  featured: false,
  madeToOrder: true,
  madeInUk: true,
  price: 499,
  wasPrice: null,
  widthCm: 240,
  depthCm: 95,
  heightCm: 90,
  plan: { kind: 'corner', top: 240, left: 240, d: 95 },
  shape: 'corner',
  seats: 5,
  material: 'Fabric',
  reclining: null,
  axis1Value: '5 Seater Corner',
  axis2Value: 'High Back',
  categoryIds: [],
  image: null,
  imageAlt: '',
  colours: [{ name: 'Grey', hex: null }],
  ...over,
})

describe('answers about a product', () => {
  it('reads its measurements the way the drawing does', () => {
    expect(sizeAnswer(piece())).toBe('The Verona 5 Seater Corner High Back measures 240 cm along each side, and it’s 95 cm deep and 90 cm high.')
    expect(sizeAnswer(piece({ dimensions: { width_cm: 240, depth_cm: 95, height_cm: 90, side_a_cm: 190, side_b_cm: 240 } }))).toMatch(
      /240 cm along one side and 190 cm along the other/,
    )
    expect(sizeAnswer(piece({ title: 'Ashton U-Shape', shape: 'u-shape', dimensions: { width_cm: 300, depth_cm: 90, height_cm: null, side_a_cm: 180, side_b_cm: 180 } }))).toBe(
      'The Ashton U-Shape is 300 cm across the back, with two sides of 180 cm; it’s 90 cm deep.',
    )
    expect(
      sizeAnswer(
        piece({
          shape: 'set',
          dimensions: { width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null },
          pieces: [
            { label: '3 Seater', width_cm: 198, depth_cm: 94, height_cm: 97 },
            { label: '2 Seater', width_cm: 168, depth_cm: 94, height_cm: 97 },
          ],
        }),
      ),
    ).toBe('The 3 seater is 198 cm wide, 94 cm deep and 97 cm high; the 2 seater is 168 cm wide, 94 cm deep and 97 cm high.')
    expect(sizeAnswer(piece({ shape: 'straight', dimensions: { width_cm: 198, depth_cm: 94, height_cm: 97, side_a_cm: null, side_b_cm: null } }))).toBe(
      'It’s 198 cm wide, 94 cm deep and 97 cm high.',
    )
    expect(sizeAnswer(piece({ shape: 'footstool', dimensions: { width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null } }))).toBeNull()
  })

  it('names the cover plainly, and says leather-look isn’t leather', () => {
    expect(coverAnswer(piece({ variants: [variant('Grey', 'Plush Velvet'), variant('Navy Blue', 'Plush Velvet')] }), 70)).toBe(
      'It’s covered in plush velvet, in grey or navy blue. It’s made to order in the UK, so you can also have it in any of our 70 fabrics.',
    )
    const roma = coverAnswer(
      piece({ madeToOrder: false, madeInUk: false, variants: [variant('Grey', 'Fabric'), variant('Black', 'Leather Aire')], specs: [{ label: 'Material', value: 'Leather Aire & Fabric' }] }),
      70,
    )
    expect(roma).toBe('It comes in grey fabric, or black Leather Aire. These are leather-look covers, not real leather: they look like leather and wipe clean.')
    expect(
      coverAnswer(
        piece({ variants: [variant('Grey', 'Plush Velvet'), variant('Black', 'Plush Velvet'), variant('Silver', 'Fabric')] }),
        70,
      ),
    ).toMatch(/^It comes in grey or black plush velvet, or silver fabric\./)
    expect(materialWords('Tech Leather')).toBe('tech leather')
    // Michigan's cover (owner's price list, 23 October 2026) is leather-look too.
    expect(
      coverAnswer(piece({ madeToOrder: false, madeInUk: false, variants: [variant('Black', 'Tech Air Leather')], specs: [{ label: 'Material', value: 'Tech Air Leather' }] }), 70),
    ).toBe('It’s covered in tech air leather, in black. These are leather-look covers, not real leather: they look like leather and wipe clean.')
  })

  it('checks a door against the smaller of depth and height, as the door check does', () => {
    expect(fitAnswer(piece(), 'sofa')).toMatch(/^Sofas go through a door on their side, so compare the smaller of its depth and height \(90 cm\) with your narrowest door or hallway\./)
    expect(fitAnswer(piece(), 'sofa')).toMatch(/arrives in sections/)
  })

  it('names the delivery areas as they read in a sentence', () => {
    expect(areaInSentence('Aberdeen area')).toBe('the Aberdeen area')
    expect(areaInSentence('Far north of Scotland')).toBe('the far north of Scotland')
    expect(areaInSentence('Scottish Highlands and Moray')).toBe('the Scottish Highlands and Moray')
    expect(areaInSentence('Devon')).toBe('Devon')
    expect(areaInSentence('North East Scotland')).toBe('North East Scotland')
  })

  it('gives delivery times and the charged areas from the settings, grouped by price', () => {
    expect(deliveryAnswer(DELIVERY)).toBe(
      'Delivery is free to most of mainland Britain and takes 2 to 4 working days. A few areas pay a delivery charge and take 5 to 7 working days: £40 to Devon; £100 to the far north of Scotland. We deliver every day except Monday.',
    )
  })

  it('asks and answers the questions people search for', () => {
    const qs = productQuestions(piece(), { delivery: DELIVERY, fabricCount: 70 })
    expect(qs.map((q) => q.id)).toEqual(['size', 'cover', 'delivery', 'pay', 'fit', 'returns', 'extras'])
    expect(qs.find((q) => q.id === 'returns')!.a).toContain(`${POLICIES.madeToOrderChangeWorkingDays} working days`)
    expect(qs.find((q) => q.id === 'extras')!.a).toContain('assembly £30')
    expect(JSON.stringify(qs)).not.toMatch(/undefined|null|NaN/)
  })
})

describe('answers about a range', () => {
  const verona: RangeSummary = {
    slug: 'verona',
    name: 'Verona',
    description: null,
    products: [
      listed('verona-hb-5', { title: 'Verona 5 Seater Corner High Back', price: 549 }),
      listed('verona-sb-5', { title: 'Verona 5 Seater Corner Scattered Back', axis2Value: 'Scattered Back', price: 499, depthCm: 90, sort: 2 }),
    ],
    price: 499,
    image: null,
    imageAlt: '',
    madeToOrder: true,
    colours: [{ name: 'Grey', hex: null }],
  }

  it('lists sizes, prices, measurements, styles and how it’s made', () => {
    const qs = rangeQuestions(verona, { delivery: DELIVERY, fabricCount: 70 })
    const a = (id: string) => qs.find((q) => q.id === id)?.a ?? ''
    expect(a('sizes')).toBe('5 seater corner, each with a high back or scattered back. Prices start at £499 and go up to £549.')
    expect(a('dimensions')).toMatch(/^5 seater corner: 240 × 240 cm, 90 to 95 cm deep \(depending on the back\), 90 cm high\./)
    expect(a('colours')).toBe('In grey fabric. It’s made to order, so you can also have it in any of our 70 fabrics.')
    expect(a('styles')).toMatch(/fixed back cushions/)
    expect(qs.find((q) => q.id === 'styles')?.q).toBe('What’s the difference between the high back and scattered back Verona?')
    expect(a('made')).toMatch(/^Yes, it’s made in the UK in the colour you choose, and still arrives in the usual delivery time\. Because it’s made to order for you/)
    expect(qs.find((q) => q.id === 'see')?.a).toMatch(/showroom/)
  })

  it('measures like the size cards do', () => {
    expect(listingSize(listed('x', { plan: { kind: 'straight', w: 198, d: 94 }, depthCm: 94, heightCm: 97 }))).toBe('198 cm wide, 94 cm deep, 97 cm high')
    expect(listingSize(listed('x', { plan: null }))).toBeNull()
  })
})

describe('answers about a category', () => {
  it('names the corners under £500 and the ones with a longer side', () => {
    const products = [
      listed('verona-4-2c1', { title: 'Verona 4 Seater Corner 2c1 High Back', price: 479, plan: { kind: 'corner', top: 240, left: 190, d: 95 } }),
      listed('ashton-5', { title: 'Ashton 5 Seater Corner High Back', price: 699 }),
    ]
    const qs = categoryQuestions('corner-sofas', { products, delivery: DELIVERY, fabricCount: 70, children: [] })
    expect(qs.find((q) => q.id === 'under-500')?.a).toBe('Yes: the Verona 4 Seater Corner 2c1 High Back at £479.')
    expect(qs.find((q) => q.id === 'hand')?.a).toMatch(/^Only if its two sides are different lengths, as on the Verona 4 Seater Corner 2c1\./)
    expect(qs.find((q) => q.id === 'price')?.a).toMatch(/^We have 2 corner sofas\. They start at £479/)
  })

  it('has nothing to say about an empty or unknown category', () => {
    expect(categoryQuestions('corner-sofas', { products: [], delivery: DELIVERY, fabricCount: 0, children: [] })).toEqual([])
    expect(categoryQuestions('dining-tables', { products: [listed('x')], delivery: DELIVERY, fabricCount: 0, children: [] })).toEqual([])
  })

  it('turns questions into FAQ data for search engines', () => {
    expect(faqJsonLd([{ id: 'a', q: 'Q?', a: 'A.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }],
    })
  })
})
