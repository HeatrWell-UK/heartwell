// Category filters and sorting, driven by each product type's filter list
// (product_types.filters), so a future coffee table brings its own filters.
// Everything lives in the address (?shape=corner&colour=grey&sort=price-asc),
// so a filtered page can be shared and works without JavaScript.

import type { ListingProduct } from './listing-types'

export const FILTER_KEYS = ['shape', 'seats', 'width', 'price', 'material', 'colour', 'reclining', 'made_to_order'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

/** The address parameter for each filter. */
export const PARAM: Record<FilterKey, string> = {
  shape: 'shape',
  seats: 'seats',
  width: 'width',
  price: 'price',
  material: 'material',
  colour: 'colour',
  reclining: 'reclining',
  made_to_order: 'mto',
}

export const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'width-asc', label: 'Width, narrowest first' },
] as const
export type SortValue = (typeof SORTS)[number]['value']

export type ActiveFilters = Partial<Record<FilterKey, string[]>>

const SHAPES: Record<string, string> = {
  straight: 'Straight sofas',
  set: '3+2 sets',
  corner: 'Corner sofas',
  'u-shape': 'U-shaped sofas',
  armchair: 'Armchairs',
  footstool: 'Footstools',
}
const WIDTHS = [200, 250, 300]
const PRICES: { value: string; label: string; min: number; max: number }[] = [
  { value: 'under-500', label: 'Under £500', min: 0, max: 499.99 },
  { value: '500-750', label: '£500 to £750', min: 500, max: 750 },
  { value: '750-1000', label: '£750 to £1,000', min: 750.01, max: 1000 },
  { value: 'over-1000', label: 'Over £1,000', min: 1000.01, max: Infinity },
]
const MATERIALS: Record<string, string> = { fabric: 'Fabric', 'leather-look': 'Faux or tech leather', leather: 'Leather' }
const COLOUR_FAMILIES: { value: string; label: string; test: RegExp }[] = [
  { value: 'grey', label: 'Grey', test: /grey|gray|charcoal|pebble|silver|slate|steel/ },
  { value: 'black', label: 'Black', test: /black/ },
  { value: 'brown', label: 'Brown and mink', test: /brown|tan\b|truffle|mink|mocha|chocolate|chestnut/ },
  { value: 'cream', label: 'Cream and beige', test: /cream|beige|oatmeal|white|ivory|sand|natural|stone/ },
  { value: 'blue', label: 'Blue', test: /blue|navy|teal|sky/ },
  { value: 'green', label: 'Green', test: /green|emerald|sage|olive/ },
  { value: 'red', label: 'Red and pink', test: /red|claret|burgundy|wine|pink|rose/ },
  { value: 'yellow', label: 'Yellow and orange', test: /yellow|mustard|ochre|orange|gold/ },
]

export const GROUP_LABEL: Record<FilterKey, string> = {
  shape: 'Shape',
  seats: 'Seats',
  width: 'Width',
  price: 'Price',
  material: 'Material',
  colour: 'Colour',
  reclining: 'Reclining',
  made_to_order: 'Made to order',
}

/** Single-choice groups (a maximum width, a price band); the rest allow several. */
export const SINGLE: ReadonlySet<FilterKey> = new Set(['width', 'price', 'made_to_order'])

export function colourFamilies(name: string): string[] {
  const n = name.toLowerCase()
  return COLOUR_FAMILIES.filter((f) => f.test.test(n)).map((f) => f.value)
}

export function materialGroups(material: string | null): string[] {
  const m = (material ?? '').toLowerCase()
  const groups: string[] = []
  if (/fabric|velvet|chenille|linen|weave/.test(m)) groups.push('fabric')
  if (/faux|tech|pu\b|bonded|pvc/.test(m)) groups.push('leather-look')
  if (/real leather|genuine leather/.test(m)) groups.push('leather')
  return groups
}

/** The values a product has for one filter. */
function valuesOf(p: ListingProduct, key: FilterKey): string[] {
  switch (key) {
    case 'shape':
      return p.shape ? [p.shape] : []
    case 'seats':
      return p.seats ? [String(p.seats)] : []
    case 'width':
      return p.widthCm ? WIDTHS.filter((w) => p.widthCm! <= w).map(String) : []
    case 'price':
      return PRICES.filter((b) => p.price >= b.min && p.price <= b.max).map((b) => b.value)
    case 'material':
      return materialGroups(p.material)
    case 'colour':
      return [...new Set(p.colours.flatMap((c) => colourFamilies(c.name)))]
    case 'reclining':
      return p.reclining ? [p.reclining.toLowerCase()] : []
    case 'made_to_order':
      return p.madeToOrder ? ['yes'] : []
  }
}

function labelOf(key: FilterKey, value: string): string {
  switch (key) {
    case 'shape':
      return SHAPES[value] ?? value
    case 'seats':
      return value === '1' ? '1 seat' : `${value} seats`
    case 'width':
      return `Up to ${value} cm wide`
    case 'price':
      return PRICES.find((b) => b.value === value)?.label ?? value
    case 'material':
      return MATERIALS[value] ?? value
    case 'colour':
      return COLOUR_FAMILIES.find((f) => f.value === value)?.label ?? value
    case 'reclining':
      return value === 'electric' ? 'Electric recliners' : value === 'manual' ? 'Manual recliners' : value
    case 'made_to_order':
      return 'Made to order in your fabric'
  }
}

const ORDER: Partial<Record<FilterKey, string[]>> = {
  shape: Object.keys(SHAPES),
  width: WIDTHS.map(String),
  price: PRICES.map((b) => b.value),
  material: Object.keys(MATERIALS),
  colour: COLOUR_FAMILIES.map((f) => f.value),
  reclining: ['electric', 'manual'],
}

type Params = Record<string, string | string[] | undefined>

export function parseListing(params: Params): { filters: ActiveFilters; sort: SortValue } {
  const filters: ActiveFilters = {}
  for (const key of FILTER_KEYS) {
    const raw = params[PARAM[key]]
    const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(',')).map((v) => v.trim().toLowerCase()).filter(Boolean)
    const unique = [...new Set(values)].slice(0, 12)
    if (unique.length) filters[key] = SINGLE.has(key) ? unique.slice(0, 1) : unique
  }
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort
  const sort = (SORTS.find((s) => s.value === sortRaw)?.value ?? 'recommended') as SortValue
  return { filters, sort }
}

export function applyFilters(products: ListingProduct[], filters: ActiveFilters, except?: FilterKey): ListingProduct[] {
  return products.filter((p) =>
    FILTER_KEYS.every((key) => {
      const wanted = filters[key]
      if (key === except || !wanted?.length) return true
      const has = valuesOf(p, key)
      return wanted.some((w) => has.includes(w))
    }),
  )
}

export function sortProducts(products: ListingProduct[], sort: SortValue): ListingProduct[] {
  const recommended = (a: ListingProduct, b: ListingProduct) =>
    Number(b.featured) - Number(a.featured) || a.rangeSort - b.rangeSort || a.sort - b.sort || a.title.localeCompare(b.title)
  const list = [...products]
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price || recommended(a, b))
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price || recommended(a, b))
    case 'width-asc':
      return list.sort((a, b) => (a.widthCm ?? 9999) - (b.widthCm ?? 9999) || recommended(a, b))
    default:
      return list.sort(recommended)
  }
}

export interface FacetOption {
  value: string
  label: string
  count: number
  selected: boolean
}
export interface Facet {
  key: FilterKey
  label: string
  single: boolean
  options: FacetOption[]
}

/**
 * The filter groups for a set of products: only the filters their product
 * types offer, only options that exist, each counted as if it were the only
 * choice in its group (so counts never read zero for a box you could tick).
 */
export function facetsFor(products: ListingProduct[], filters: ActiveFilters): Facet[] {
  const offered = new Set(products.flatMap((p) => p.typeFilters))
  const facets: Facet[] = []
  for (const key of FILTER_KEYS) {
    if (!offered.has(key)) continue
    const pool = applyFilters(products, filters, key)
    const counts = new Map<string, number>()
    for (const p of pool) for (const v of valuesOf(p, key)) counts.set(v, (counts.get(v) ?? 0) + 1)
    const selected = filters[key] ?? []
    const values = [...new Set([...products.flatMap((p) => valuesOf(p, key)), ...selected])]
    const order = ORDER[key]
    values.sort((a, b) => (order ? order.indexOf(a) - order.indexOf(b) : Number(a) - Number(b)))
    const options = values.map((value) => ({ value, label: labelOf(key, value), count: counts.get(value) ?? 0, selected: selected.includes(value) }))
    // A group is worth showing when it can narrow the list: several options, or
    // one option (like "Made to order") that only some of the pieces have.
    const narrows = options.length > 1 || (options.length === 1 && options[0]!.count > 0 && options[0]!.count < pool.length)
    if (narrows || options.some((o) => o.selected)) facets.push({ key, label: GROUP_LABEL[key], single: SINGLE.has(key), options })
  }
  return facets
}

/** The address with one value removed (or a whole group, or everything). */
export function listingHref(path: string, filters: ActiveFilters, sort: SortValue, change?: { key: FilterKey; value?: string } | 'clear'): string {
  const params = new URLSearchParams()
  if (change !== 'clear') {
    for (const key of FILTER_KEYS) {
      let values = filters[key] ?? []
      if (change && change.key === key) values = change.value ? values.filter((v) => v !== change.value) : []
      for (const v of values) params.append(PARAM[key], v)
    }
  }
  if (sort !== 'recommended') params.set('sort', sort)
  const q = params.toString()
  return q ? `${path}?${q}` : path
}

export interface Chip {
  label: string
  href: string
}

export function activeChips(path: string, filters: ActiveFilters, sort: SortValue): Chip[] {
  return FILTER_KEYS.flatMap((key) => (filters[key] ?? []).map((value) => ({ label: labelOf(key, value), href: listingHref(path, filters, sort, { key, value }) })))
}

export const hasFilters = (filters: ActiveFilters) => FILTER_KEYS.some((k) => (filters[k]?.length ?? 0) > 0)

/** The filters after ticking or unticking one option. */
export function toggleFilter(filters: ActiveFilters, key: FilterKey, value: string): ActiveFilters {
  const current = filters[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : SINGLE.has(key) ? [value] : [...current, value]
  return { ...filters, [key]: next }
}
