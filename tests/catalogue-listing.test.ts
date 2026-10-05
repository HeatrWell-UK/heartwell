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
import { pickPopular } from '@/components/home/PopularNow'
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
  rangeSort: 999,
  sort: 1,
  featured: false,
  madeToOrder: false,
  madeInUk: false,
  price: 500,
  widthCm: 200,
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
})

describe('popular right now', () => {
  it('picks featured pieces with photos, one per range', () => {
    const list = [
      product('a1', { rangeSlug: 'a', featured: true }),
      product('a2', { rangeSlug: 'a', featured: true }),
      product('b1', { rangeSlug: 'b', featured: true, image: null }),
      product('c1', { rangeSlug: 'c' }),
      product('d1', { rangeSlug: 'd', featured: true }),
    ]
    expect(pickPopular(list, 3).map((p) => p.slug)).toEqual(['a1', 'd1', 'c1'])
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
