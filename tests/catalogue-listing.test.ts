import { describe, expect, it } from 'vitest'
import { categoryHref, childrenOf, resolveCategory, subtreeIds, trail, type CategoryNode } from '@/lib/catalogue/tree'
import {
  activeChips,
  applyFilters,
  colourFamilies,
  facetsFor,
  listingHref,
  materialGroups,
  parseListing,
  sortProducts,
  toggleFilter,
} from '@/lib/catalogue/filters'
import { normaliseQuery, searchCatalogue } from '@/lib/catalogue/search'
import { homeRanges, homeSwatches, isShowcaseColour } from '@/lib/home/picks'
import type { RangeSummary } from '@/lib/catalogue/listing'
import { planExtent, planFrame, planSummary, rangeSizes, sizeLabel, SET_GAP_CM } from '@/lib/catalogue/range-sizes'
import type { ListingProduct } from '@/lib/catalogue/listing-types'

const node = (id: string, slug: string, parentId: string | null, sort = 1): CategoryNode => ({
  id,
  slug,
  name: slug.replace(/-/g, ' '),
  parentId,
  sort,
  description: null,
  seoTitle: null,
  seoDescription: null,
  imageUrl: null,
})
const tree = [
  node('s', 'sofas', null),
  node('c', 'corner-sofas', 's', 1),
  node('r', 'recliners', 's', 6),
  node('e', 'electric-recliners', 'r', 1),
  node('d', 'dining', null, 2),
]

const SOFA_FILTERS = ['shape', 'seats', 'width', 'material', 'colour', 'reclining', 'made_to_order', 'price']
const product = (slug: string, extra: Partial<ListingProduct> = {}): ListingProduct => ({
  slug,
  title: slug.replace(/-/g, ' '),
  typeSlug: 'sofa',
  typeName: 'Sofa',
  typeFilters: SOFA_FILTERS,
  rangeSlug: null,
  rangeName: null,
  rangeDescription: null,
  rangeSort: 999,
  sort: 1,
  featured: false,
  madeToOrder: false,
  madeInUk: false,
  price: 500,
  wasPrice: null,
  widthCm: 200,
  depthCm: 90,
  heightCm: 95,
  plan: null,
  shape: 'straight',
  seats: 3,
  material: 'Fabric',
  reclining: null,
  axis1Value: null,
  axis2Value: null,
  categoryIds: ['c'],
  image: 'https://example.test/a.png',
  imageAlt: '',
  colours: [{ name: 'Grey', hex: '#777777' }],
  ...extra,
})

describe('category tree', () => {
  it('puts departments at the top and everything else one level under them', () => {
    expect(categoryHref(tree, tree[0]!)).toBe('/sofas')
    expect(categoryHref(tree, tree[1]!)).toBe('/sofas/corner-sofas')
    expect(categoryHref(tree, tree[3]!)).toBe('/sofas/electric-recliners')
    expect(categoryHref(tree, tree[4]!)).toBe('/dining')
  })

  it('resolves addresses only within their own department', () => {
    expect(resolveCategory(tree, 'sofas')?.id).toBe('s')
    expect(resolveCategory(tree, 'sofas', 'electric-recliners')?.id).toBe('e')
    expect(resolveCategory(tree, 'dining', 'corner-sofas')).toBeNull()
    expect(resolveCategory(tree, 'corner-sofas')).toBeNull()
    expect(resolveCategory(tree, 'sofas', 'sofas')).toBeNull()
  })

  it('collects a category with everything beneath it, and the trail down to it', () => {
    expect([...subtreeIds(tree, 'r')].sort()).toEqual(['e', 'r'])
    expect([...subtreeIds(tree, 's')].sort()).toEqual(['c', 'e', 'r', 's'])
    expect(trail(tree, tree[3]!).map((c) => c.slug)).toEqual(['sofas', 'recliners', 'electric-recliners'])
    expect(childrenOf(tree, null).map((c) => c.slug)).toEqual(['sofas', 'dining'])
  })
})

describe('filters', () => {
  const list = [
    product('grey-corner', { shape: 'corner', seats: 5, widthCm: 240, price: 749, madeToOrder: true }),
    product('black-recliner', { reclining: 'Electric', material: 'Faux Leather', colours: [{ name: 'Black', hex: '#000000' }], price: 999, widthCm: 198 }),
    product('cream-set', { shape: 'set', material: 'Fabric & Faux Leather', colours: [{ name: 'Oatmeal', hex: null }], price: 449 }),
  ]

  it('reads filters from the address, ignoring junk and keeping single choices single', () => {
    expect(parseListing({ shape: ['corner', 'set'], width: ['250', '300'], sort: 'price-asc', colour: 'GREY' })).toEqual({
      filters: { shape: ['corner', 'set'], width: ['250'], colour: ['grey'] },
      sort: 'price-asc',
    })
    expect(parseListing({ sort: 'nonsense' }).sort).toBe('recommended')
  })

  it('combines values in a group with OR and groups with AND', () => {
    expect(applyFilters(list, { shape: ['corner', 'set'] }).map((p) => p.slug)).toEqual(['grey-corner', 'cream-set'])
    expect(applyFilters(list, { shape: ['corner', 'set'], price: ['under-500'] }).map((p) => p.slug)).toEqual(['cream-set'])
    expect(applyFilters(list, { width: ['200'] }).map((p) => p.slug)).toEqual(['black-recliner', 'cream-set'])
    expect(applyFilters(list, { made_to_order: ['yes'] }).map((p) => p.slug)).toEqual(['grey-corner'])
  })

  it('groups colours and materials into families', () => {
    expect(colourFamilies('Elephant Grey')).toEqual(['grey'])
    expect(colourFamilies('Black & Grey').sort()).toEqual(['black', 'grey'])
    expect(colourFamilies('Truffle')).toEqual(['brown'])
    expect(colourFamilies('Oatmeal')).toEqual(['cream'])
    expect(materialGroups('Fabric & Faux Leather')).toEqual(['fabric', 'leather-look'])
    expect(materialGroups('Real Leather')).toEqual(['leather'])
    expect(materialGroups('Tech Leather')).toEqual(['leather-look'])
    expect(materialGroups('Leather Aire & Fabric')).toEqual(['fabric', 'leather-look'])
  })

  it('counts each option as if it were the only choice in its group', () => {
    const facets = facetsFor(list, { shape: ['corner'] })
    const shape = facets.find((f) => f.key === 'shape')!
    expect(shape.options.map((o) => [o.value, o.count, o.selected])).toEqual([
      ['straight', 1, false],
      ['set', 1, false],
      ['corner', 1, true],
    ])
    const colour = facets.find((f) => f.key === 'colour')!
    expect(colour.options.map((o) => [o.value, o.count])).toEqual([
      ['grey', 1],
      ['black', 0],
      ['cream', 0],
    ])
  })

  it('offers only the filters the product types have', () => {
    const chairs = [product('a', { typeFilters: ['material', 'price'] }), product('b', { typeFilters: ['material', 'price'], price: 900 })]
    expect(facetsFor(chairs, {}).map((f) => f.key)).toEqual(['price'])
  })

  it('sorts, featured first by default', () => {
    expect(sortProducts(list, 'price-asc').map((p) => p.price)).toEqual([449, 749, 999])
    expect(sortProducts(list, 'price-desc').map((p) => p.price)).toEqual([999, 749, 449])
    expect(sortProducts([product('x'), product('y', { featured: true })], 'recommended')[0]!.slug).toBe('y')
  })

  it('builds addresses for chips, toggles and clearing', () => {
    const filters = { shape: ['corner', 'set'], colour: ['grey'] }
    expect(listingHref('/sofas', filters, 'price-asc')).toBe('/sofas?shape=corner&shape=set&colour=grey&sort=price-asc')
    expect(listingHref('/sofas', filters, 'recommended', 'clear')).toBe('/sofas')
    expect(activeChips('/sofas', filters, 'recommended').map((c) => [c.label, c.href])).toEqual([
      ['Corner sofas', '/sofas?shape=set&colour=grey'],
      ['3+2 sets', '/sofas?shape=corner&colour=grey'],
      ['Grey', '/sofas?shape=corner&shape=set'],
    ])
    expect(toggleFilter({ price: ['under-500'] }, 'price', '500-750')).toEqual({ price: ['500-750'] })
    expect(toggleFilter({ shape: ['corner'] }, 'shape', 'corner')).toEqual({ shape: [] })
    expect(toggleFilter({ shape: ['corner'] }, 'shape', 'set')).toEqual({ shape: ['corner', 'set'] })
  })
})

describe('search', () => {
  const list = [
    product('verona-corner', { title: 'Verona 5 Seater Corner', rangeName: 'Verona', shape: 'corner', seats: 5 }),
    product('roma-3-2', { title: 'Roma Recliner 3+2', rangeName: 'Roma Recliner', shape: 'set', reclining: 'Manual', colours: [{ name: 'Black', hex: null }] }),
    product('lily-u', { title: 'Lily U-Shape High Back', rangeName: 'Lily', shape: 'u-shape', colours: [{ name: 'Navy Blue', hex: null }] }),
  ]
  const names = () => []

  it('understands the ways people type shapes and sets', () => {
    expect(normaliseQuery('U shaped Gray 3 + 2 sofa')).toBe('ushape grey 3plus2 sofa')
    expect(normaliseQuery('3 and 2 seaters')).toBe('3plus2 seaters')
    expect(normaliseQuery('Arm chair')).toBe('armchair')
  })

  it('needs every word to match, by the start of a word', () => {
    expect(searchCatalogue(list, 'corner grey', names).products.map((p) => p.slug)).toEqual(['verona-corner'])
    expect(searchCatalogue(list, 'u shape', names).products.map((p) => p.slug)).toEqual(['lily-u'])
    expect(searchCatalogue(list, 'recl', names).products.map((p) => p.slug)).toEqual(['roma-3-2'])
    expect(searchCatalogue(list, '3 and 2 black', names).products.map((p) => p.slug)).toEqual(['roma-3-2'])
  })

  it('falls back to the closest matches, and ignores filler words', () => {
    const r = searchCatalogue(list, 'verona purple', names)
    expect(r.partial).toBe(true)
    expect(r.products.map((p) => p.slug)).toEqual(['verona-corner'])
    expect(searchCatalogue(list, 'the sofa', names)).toEqual({ products: [], partial: false, terms: [] })
  })

  it('reads the range’s own words too, so "velvet" finds the velvet range', () => {
    const withWords = [
      ...list,
      product('ashton-3', { title: 'Ashton 3 Seater', rangeName: 'Ashton', rangeDescription: 'Ashton is plush velvet with deep-buttoned arms.' }),
    ]
    expect(searchCatalogue(withWords, 'velvet', names).products.map((p) => p.slug)).toEqual(['ashton-3'])
  })
})

describe('home page ranges', () => {
  const range = (slug: string, featured: boolean, image: string | null = 'https://example.test/r.png'): RangeSummary => ({
    slug,
    name: slug.toUpperCase(),
    description: null,
    products: [product(`${slug}1`, { rangeSlug: slug, featured })],
    price: 500,
    image,
    imageAlt: '',
    madeToOrder: false,
    colours: [],
  })

  it('shows photographed ranges, the ones with featured pieces first, in catalogue order', () => {
    const ranges = [range('a', false), range('b', true, null), range('c', true), range('d', false), range('e', true)]
    expect(homeRanges(ranges, 3).map((r) => r.slug)).toEqual(['c', 'e', 'a'])
  })
})

describe('home page swatches', () => {
  const collection = (name: string, fabrics: [string, string][]) => ({
    slug: name.toLowerCase(),
    name,
    surcharge: 0,
    fabrics: fabrics.map(([n, hex], i) => ({ id: `${name}${i}`, code: `${name}${i}`, name: n, hex, image: null, swatchable: true })),
  })

  it('leaves out greens, pinks and oranges, the owner’s rule for the shop’s own pages', () => {
    // Strong reds and aubergines (#83030F, #30040A) photograph pink or coral, so they stay off the home page's swatches.
    for (const hex of ['#012724', '#047379', '#66B6CC', '#DA6E8A', '#D8B7BF', '#E07E49', '#825018', '#83030F', '#30040A', '#CC092F']) expect(isShowcaseColour(hex)).toBe(false)
    for (const hex of ['#D2C9B6', '#855F48', '#133A68', '#2F201E', '#281A32', '#050505', '#949190']) expect(isShowcaseColour(hex)).toBe(true)
  })

  it('keeps one of each name and near-identical colour, light to dark, spread evenly', () => {
    const picks = homeSwatches(
      [
        collection('Chenille', [['Cream', '#D2C9B6'], ['Black', '#292524'], ['Pink', '#D8B7BF']]),
        collection('Velvet', [['Cream', '#BBB7B2'], ['Ink', '#2A2626'], ['Mink', '#836551']]),
      ],
      4,
    )
    expect(picks.map((p) => p.name)).toEqual(['Cream', 'Mink', 'Black'])
  })
})

describe('single-option filters', () => {
  it('shows "Made to order" only when it narrows the list', () => {
    const some = [product('a', { madeToOrder: true }), product('b')]
    expect(facetsFor(some, {}).some((f) => f.key === 'made_to_order')).toBe(true)
    const all = [product('a', { madeToOrder: true }), product('b', { madeToOrder: true })]
    expect(facetsFor(all, {}).some((f) => f.key === 'made_to_order')).toBe(false)
  })
})

describe('a range page’s sizes', () => {
  const straight = (w: number, d: number | null = 95) => ({ kind: 'straight' as const, w, d })
  const verona = [
    product('v-hb-2', { sort: 2, axis1Value: '2 Seater', axis2Value: 'High Back', price: 369, plan: straight(168, 99) }),
    product('v-sb-2', { sort: 3, axis1Value: '2 Seater', axis2Value: 'Scattered Back', price: 349, plan: straight(168, 94) }),
    product('v-sb-arm', { sort: 1, axis1Value: 'Armchair', axis2Value: 'Scattered Back', price: 249, plan: straight(115, 94) }),
    product('v-hb-arm', { sort: 0, axis1Value: 'Armchair', axis2Value: 'High Back', price: 279, plan: straight(115, 99) }),
    product('v-hb-u', { sort: 4, axis1Value: 'Armed U-Shape', axis2Value: 'High Back', price: 899, plan: { kind: 'u', back: 300, left: 240, right: 180, d: 95 } }),
  ]

  it('lists each size once, in the range’s order, with its back styles always in the same order', () => {
    const sizes = rangeSizes(verona)
    expect(sizes.map((s) => s.label)).toEqual(['Armchair', '2 seater', 'Armed U-shape'])
    expect(sizes[0]!.options.map((o) => [o.style, o.slug, o.price])).toEqual([
      ['High back', 'v-hb-arm', 279],
      ['Scattered back', 'v-sb-arm', 249],
    ])
    expect(sizes[2]!.options).toEqual([{ style: 'High back', slug: 'v-hb-u', price: 899, from: false }])
  })

  it('leaves the style off in a range with only one', () => {
    const one = rangeSizes([product('s2', { axis1Value: '2 Seater', axis2Value: null }), product('s3', { axis1Value: '3 Seater' })])
    expect(one.map((s) => s.options[0]!.style)).toEqual([null, null])
  })

  it('draws every size in one frame, so they share a scale', () => {
    const set = { kind: 'set' as const, pieces: [{ label: '3 Seater', w: 198, d: 99 }, { label: '2 Seater', w: 168, d: null }] }
    expect(planExtent(set)).toEqual({ w: 198 + 168 + SET_GAP_CM, d: 99 })
    expect(planExtent({ kind: 'corner', top: 240, left: 190, d: null })).toEqual({ w: 240, d: 190 })
    expect(planFrame([straight(115), null, set])).toEqual({ w: 198 + 168 + SET_GAP_CM, d: 99 })
    expect(planFrame([null])).toBeNull()
  })

  it('says the measurement people compare first', () => {
    expect(planSummary(straight(198))).toBe('198 cm wide')
    expect(planSummary({ kind: 'corner', top: 240, left: 240, d: 95 })).toBe('240 cm each way')
    expect(planSummary({ kind: 'corner', top: 240, left: 190, d: 95 })).toBe('240 × 190 cm')
    expect(planSummary({ kind: 'u', back: 300, left: 180, right: 180, d: 95 })).toBe('300 cm wide, sides 180 cm')
    expect(planSummary({ kind: 'set', pieces: [{ label: '3', w: 198, d: 99 }, { label: '2', w: 168, d: 99 }] })).toBe('198 cm and 168 cm wide')
  })

  it('writes sizes in sentence case, keeping the letter in U-shape and L-shape', () => {
    expect(['3 Seater', 'Armed U-Shape', 'L-Shape', '4 Seater Corner 2c1', 'High Back'].map(sizeLabel)).toEqual([
      '3 seater',
      'Armed U-shape',
      'L-shape',
      '4 seater corner 2c1',
      'High back',
    ])
  })
})
