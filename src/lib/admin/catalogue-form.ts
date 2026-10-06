// The admin product editor's model: a draft the form edits (every value a
// string, as inputs give them), the checks it must pass, and the payload the
// database function admin_save_product takes. Pure, so it can be tested and
// shared by the form and the Server Action, which checks everything again.

import { z } from 'zod'

export const SPEC_KINDS = ['text', 'number', 'boolean', 'pieces'] as const
export type SpecKind = (typeof SPEC_KINDS)[number]

/** One field of a product type's Specifications panel (product_types.spec_fields). */
export interface SpecFieldDef {
  key: string
  label: string
  kind: SpecKind
  /** Text fields only: a fixed list, shown as a dropdown (e.g. a sofa's shape). */
  options?: string[]
}

export const OFFER_TIERS = ['HIGH', 'MID', 'STANDARD', 'EXCLUDED'] as const
export type OfferTier = (typeof OFFER_TIERS)[number]

export const ORIGINS = [
  { value: 'unspecified', label: 'Not stated' },
  { value: 'uk', label: 'Made in the UK' },
  { value: 'imported', label: 'Imported' },
] as const

export const DIM_FIELDS = [
  { key: 'width_cm', label: 'Width', hint: 'Overall, side to side. For a U-shape, the back.' },
  { key: 'depth_cm', label: 'Depth', hint: 'Front to back.' },
  { key: 'height_cm', label: 'Height', hint: 'Floor to the highest point.' },
  { key: 'seat_height_cm', label: 'Seat height', hint: 'Seating only.' },
  { key: 'seat_depth_cm', label: 'Seat depth', hint: 'Seating only.' },
  { key: 'side_a_cm', label: 'Corner: left side', hint: 'Corner and U-shapes only.' },
  { key: 'side_b_cm', label: 'Corner: right side', hint: 'Corner and U-shapes only.' },
] as const
export type DimKey = (typeof DIM_FIELDS)[number]['key']

export interface VariantDraft {
  /** React key only. */
  key: string
  id: string | null
  sku: string
  colourName: string
  colourHex: string
  materialLabel: string
  priceAdjustment: string
  imageUrl: string
  isActive: boolean
}

export interface PieceDraft {
  label: string
  width: string
  depth: string
  height: string
}

export interface ProductDraft {
  id: string | null
  title: string
  slug: string
  tradeTitle: string
  productType: string
  range: string
  axis1: string
  axis2: string
  primaryCategory: string
  categories: string[]
  basePrice: string
  offerTier: OfferTier | ''
  origin: 'uk' | 'imported' | 'unspecified'
  madeToOrder: boolean
  isFeatured: boolean
  isActive: boolean
  sort: string
  dims: Record<DimKey, string>
  dimensionsNote: string
  specs: Record<string, string | boolean>
  pieces: PieceDraft[]
  description: string
  /** One per line. */
  highlights: string
  seoTitle: string
  seoDescription: string
  gallery: string[]
  variants: VariantDraft[]
}

export const CLOUDINARY_IMAGE = /^https:\/\/res\.cloudinary\.com\/[^/\s]+\/image\/upload\/\S+$/
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SKU = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,39}$/
const HEX = /^#[0-9A-Fa-f]{6}$/
const PRICE = /^\d{1,7}(\.\d{1,2})?$/
const SIGNED_PRICE = /^-?\d{1,6}(\.\d{1,2})?$/
const NUMBER = /^\d{1,4}(\.\d{1,2})?$/

let counter = 0
export const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`

/** "Oak & Glass Coffee Table" → "oak-and-glass-coffee-table". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

export const emptyVariant = (): VariantDraft => ({
  key: newKey(),
  id: null,
  sku: '',
  colourName: '',
  colourHex: '',
  materialLabel: '',
  priceAdjustment: '0',
  imageUrl: '',
  isActive: true,
})

const emptyDims = (): Record<DimKey, string> => Object.fromEntries(DIM_FIELDS.map((d) => [d.key, ''])) as Record<DimKey, string>

export function emptyDraft(productType: string): ProductDraft {
  return {
    id: null,
    title: '',
    slug: '',
    tradeTitle: '',
    productType,
    range: '',
    axis1: '',
    axis2: '',
    primaryCategory: '',
    categories: [],
    basePrice: '',
    offerTier: 'STANDARD',
    origin: 'unspecified',
    madeToOrder: false,
    isFeatured: false,
    isActive: true,
    sort: '99',
    dims: emptyDims(),
    dimensionsNote: '',
    specs: {},
    pieces: [],
    description: '',
    highlights: '',
    seoTitle: '',
    seoDescription: '',
    gallery: [],
    variants: [emptyVariant()],
  }
}

/** A product as stored, in the shape the editor needs. */
export interface ProductRow {
  id: string
  slug: string
  title: string
  trade_title: string | null
  type: { slug: string } | null
  range: { slug: string } | null
  primary: { slug: string } | null
  axis1_value: string | null
  axis2_value: string | null
  base_price: number
  origin: string
  made_to_order: boolean
  is_featured: boolean
  is_active: boolean
  sort: number
  width_cm: number | null
  depth_cm: number | null
  height_cm: number | null
  seat_height_cm: number | null
  seat_depth_cm: number | null
  side_a_cm: number | null
  side_b_cm: number | null
  dimensions_note: string | null
  specifications: unknown
  description: string | null
  highlights: string[]
  seo_title: string | null
  seo_description: string | null
  gallery_images: string[]
  categories: string[]
  tier: string | null
  variants: {
    id: string
    sku: string
    colour_name: string | null
    colour_hex: string | null
    material_label: string | null
    price_adjustment: number
    image_url: string | null
    sort: number
    is_active: boolean
  }[]
}

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? '' : String(v))

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export function draftFromRow(row: ProductRow, fields: SpecFieldDef[]): ProductDraft {
  const stored = asRecord(row.specifications)
  const specs: Record<string, string | boolean> = {}
  for (const f of fields) {
    const v = stored[f.key]
    if (f.kind === 'boolean') specs[f.key] = v === true
    else if (f.kind !== 'pieces' && (typeof v === 'string' || typeof v === 'number')) specs[f.key] = String(v)
  }
  const pieces = Array.isArray(stored.pieces)
    ? (stored.pieces as Record<string, unknown>[]).map((p) => ({
        label: typeof p.label === 'string' ? p.label : '',
        width: typeof p.width_cm === 'number' ? String(p.width_cm) : '',
        depth: typeof p.depth_cm === 'number' ? String(p.depth_cm) : '',
        height: typeof p.height_cm === 'number' ? String(p.height_cm) : '',
      }))
    : []
  const tier = OFFER_TIERS.find((t) => t === row.tier) ?? ''
  const origin = row.origin === 'uk' || row.origin === 'imported' ? row.origin : 'unspecified'
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    tradeTitle: row.trade_title ?? '',
    productType: row.type?.slug ?? '',
    range: row.range?.slug ?? '',
    axis1: row.axis1_value ?? '',
    axis2: row.axis2_value ?? '',
    primaryCategory: row.primary?.slug ?? '',
    categories: row.categories.filter((c) => c !== row.primary?.slug),
    basePrice: str(row.base_price),
    offerTier: tier,
    origin,
    madeToOrder: row.made_to_order,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    sort: str(row.sort),
    dims: Object.fromEntries(DIM_FIELDS.map((d) => [d.key, str(row[d.key])])) as Record<DimKey, string>,
    dimensionsNote: row.dimensions_note ?? '',
    specs,
    pieces,
    description: row.description ?? '',
    highlights: row.highlights.join('\n'),
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    gallery: row.gallery_images,
    variants: [...row.variants]
      .sort((a, b) => a.sort - b.sort || a.sku.localeCompare(b.sku))
      .map((v) => ({
        key: v.id,
        id: v.id,
        sku: v.sku,
        colourName: v.colour_name ?? '',
        colourHex: v.colour_hex ?? '',
        materialLabel: v.material_label ?? '',
        priceAdjustment: str(v.price_adjustment),
        imageUrl: v.image_url ?? '',
        isActive: v.is_active,
      })),
  }
}

/** A copy to start a similar product from: same details, new name, address and SKUs. */
export function copyDraft(d: ProductDraft): ProductDraft {
  return {
    ...d,
    id: null,
    title: `${d.title} (copy)`,
    slug: d.slug ? `${d.slug}-copy` : '',
    isActive: false,
    variants: d.variants.map((v) => ({ ...v, key: newKey(), id: null, sku: '' })),
  }
}

export interface DraftProblem {
  field: string
  message: string
}

/** Everything that would stop a save, in the order the form shows it. */
export function checkDraft(d: ProductDraft, fields: SpecFieldDef[]): DraftProblem[] {
  const problems: DraftProblem[] = []
  const add = (field: string, message: string) => problems.push({ field, message })
  if (!d.title.trim()) add('title', 'Give the product a name.')
  if (!SLUG.test(d.slug)) add('slug', 'The web address can use small letters, numbers and single hyphens only.')
  if (!d.productType) add('productType', 'Choose the product type.')
  if (!PRICE.test(d.basePrice.trim())) add('basePrice', 'Enter the price in pounds, e.g. 749 or 749.99.')
  if (d.range && !d.axis1.trim()) add('axis1', 'Products in a range need their size (or first option).')
  for (const dim of DIM_FIELDS) {
    const v = d.dims[dim.key].trim()
    if (v && (!NUMBER.test(v) || Number(v) <= 0)) add(`dims.${dim.key}`, `${dim.label}: enter centimetres, e.g. 198.`)
  }
  for (const f of fields) {
    const v = d.specs[f.key]
    if (f.kind === 'number' && typeof v === 'string' && v.trim() && !/^\d{1,5}(\.\d{1,2})?$/.test(v.trim())) add(`specs.${f.key}`, `${f.label}: enter a number.`)
  }
  d.pieces.forEach((p, i) => {
    if (!p.label.trim()) add(`pieces.${i}`, `Piece ${i + 1}: give it a name, e.g. 3 seater.`)
    for (const [k, v] of [['width', p.width], ['depth', p.depth], ['height', p.height]] as const) {
      if (v.trim() && (!NUMBER.test(v.trim()) || Number(v) <= 0)) add(`pieces.${i}`, `Piece ${i + 1}: the ${k} must be centimetres.`)
    }
  })
  if (d.gallery.some((u) => !CLOUDINARY_IMAGE.test(u))) add('gallery', 'Photos must be Cloudinary image links.')
  if (d.variants.length === 0) add('variants', 'Add at least one colourway (every product needs a SKU).')
  const skus = new Set<string>()
  d.variants.forEach((v, i) => {
    const n = `Colourway ${i + 1}`
    const sku = v.sku.trim()
    if (!SKU.test(sku)) add(`variants.${i}.sku`, `${n}: enter the SKU (letters, numbers, - . / and spaces).`)
    else if (skus.has(sku.toUpperCase())) add(`variants.${i}.sku`, `${n}: the SKU ${sku} is used twice.`)
    skus.add(sku.toUpperCase())
    if (v.colourHex.trim() && !HEX.test(v.colourHex.trim())) add(`variants.${i}.colourHex`, `${n}: the colour code looks like #8A8D8F.`)
    if (!SIGNED_PRICE.test(v.priceAdjustment.trim() || '0')) add(`variants.${i}.priceAdjustment`, `${n}: the price difference is in pounds, e.g. 20 or -10.`)
    if (v.imageUrl.trim() && !CLOUDINARY_IMAGE.test(v.imageUrl.trim())) add(`variants.${i}.imageUrl`, `${n}: the photo must be a Cloudinary image link.`)
  })
  if (d.variants.length > 0 && !d.variants.some((v) => v.isActive)) add('variants', 'Keep at least one colourway shown, or hide the whole product instead.')
  return problems
}

const num = (v: string) => {
  const t = v.trim()
  return t === '' ? null : Number(t)
}

/**
 * The specifications object to store: the type's fields from the form, plus
 * anything already stored that the type doesn't list (kept, never lost).
 */
export function specsPayload(fields: SpecFieldDef[], d: Pick<ProductDraft, 'specs' | 'pieces'>, stored: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = { ...stored }
  for (const f of fields) {
    delete out[f.key]
    if (f.kind === 'pieces') {
      const pieces = d.pieces
        .filter((p) => p.label.trim())
        .map((p) => ({ label: p.label.trim(), width_cm: num(p.width), depth_cm: num(p.depth), height_cm: num(p.height) }))
      if (pieces.length) out[f.key] = pieces
      continue
    }
    const v = d.specs[f.key]
    if (f.kind === 'boolean') {
      if (v === true) out[f.key] = true
    } else if (typeof v === 'string' && v.trim()) {
      out[f.key] = f.kind === 'number' ? Number(v.trim()) : v.trim()
    }
  }
  return out
}

/** The argument for public.admin_save_product. */
export function savePayload(d: ProductDraft, fields: SpecFieldDef[], storedSpecs: Record<string, unknown> = {}) {
  return {
    id: d.id,
    slug: d.slug.trim(),
    title: d.title.trim(),
    trade_title: d.tradeTitle.trim(),
    product_type: d.productType,
    range: d.range,
    axis1_value: d.range ? d.axis1.trim() : '',
    axis2_value: d.range ? d.axis2.trim() : '',
    primary_category: d.primaryCategory,
    categories: [...new Set([d.primaryCategory, ...d.categories].filter(Boolean))],
    base_price: d.basePrice.trim(),
    offer_tier: d.offerTier,
    origin: d.origin,
    made_to_order: d.madeToOrder,
    is_featured: d.isFeatured,
    is_active: d.isActive,
    sort: d.sort.trim() || '99',
    ...(Object.fromEntries(DIM_FIELDS.map((dim) => [dim.key, d.dims[dim.key].trim()])) as Record<DimKey, string>),
    dimensions_note: d.dimensionsNote.trim(),
    specifications: specsPayload(fields, d, storedSpecs),
    description: d.description.trim(),
    highlights: d.highlights
      .split('\n')
      .map((h) => h.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 12),
    seo_title: d.seoTitle.trim(),
    seo_description: d.seoDescription.trim(),
    gallery_images: d.gallery,
    variants: d.variants.map((v, i) => ({
      id: v.id,
      sku: v.sku.trim(),
      colour_name: v.colourName.trim(),
      colour_hex: v.colourHex.trim(),
      material_label: v.materialLabel.trim(),
      price_adjustment: v.priceAdjustment.trim() || '0',
      image_url: v.imageUrl.trim(),
      sort: String(i + 1),
      is_active: v.isActive,
    })),
  }
}

/** The form's draft as the Server Action receives it (checked again there). */
const text = (max: number) => z.string().max(max)
export const DraftSchema = z.object({
  id: z.uuid().nullable(),
  title: text(200),
  slug: text(80),
  tradeTitle: text(200),
  productType: text(60),
  range: text(80),
  axis1: text(80),
  axis2: text(80),
  primaryCategory: text(80),
  categories: z.array(text(80)).max(30),
  basePrice: text(12),
  offerTier: z.enum([...OFFER_TIERS, '']),
  origin: z.enum(['uk', 'imported', 'unspecified']),
  madeToOrder: z.boolean(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  sort: text(6),
  dims: z.record(z.enum(DIM_FIELDS.map((d) => d.key) as [DimKey, ...DimKey[]]), text(10)),
  dimensionsNote: text(300),
  specs: z.record(text(40), z.union([text(200), z.boolean()])),
  pieces: z.array(z.object({ label: text(60), width: text(10), depth: text(10), height: text(10) })).max(6),
  description: text(8000),
  highlights: text(3000),
  seoTitle: text(120),
  seoDescription: text(320),
  gallery: z.array(text(400)).max(20),
  variants: z
    .array(
      z.object({
        key: text(40),
        id: z.uuid().nullable(),
        sku: text(40),
        colourName: text(80),
        colourHex: text(7),
        materialLabel: text(80),
        priceAdjustment: text(10),
        imageUrl: text(400),
        isActive: z.boolean(),
      }),
    )
    .max(60),
})

const MESSAGES: Record<string, string> = {
  BAD_SLUG: 'The web address can use small letters, numbers and single hyphens only.',
  MISSING_TITLE: 'Give the product a name.',
  BAD_PRICE: 'Enter the price in pounds, e.g. 749 or 749.99.',
  UNKNOWN_TYPE: 'That product type no longer exists. Reload the page.',
  UNKNOWN_RANGE: 'That range no longer exists. Reload the page.',
  UNKNOWN_CATEGORY: 'That category no longer exists. Reload the page.',
  NO_COLOURWAYS: 'Add at least one colourway (every product needs a SKU).',
  NOT_FOUND: 'This product has been deleted. Go back to the catalogue.',
  SLUG_TAKEN: 'Another product already uses that web address. Change it slightly.',
  SKU_TAKEN: 'One of these SKUs is already used by another product.',
  RANGE_SIZE_TAKEN: 'This range already has a product with that size and style. Change one of them.',
  HAS_ORDERS: 'This product has been ordered, so it can’t be deleted. Hide it instead.',
  NOT_AUTHORISED: 'Please sign in again.',
}

const CONSTRAINTS: Record<string, string> = {
  products_width_cm_check: 'Measurements must be more than 0 cm.',
  products_depth_cm_check: 'Measurements must be more than 0 cm.',
  products_height_cm_check: 'Measurements must be more than 0 cm.',
  product_variants_colour_hex_check: 'A colour code looks like #8A8D8F.',
  offer_product_tiers_tier_check: 'Choose an offer tier from the list.',
}

/** The note after a save, from what the database reports. */
export function savedNote(removed: number, hidden: number): string {
  const n = (count: number, one: string) => `${count} ${one}${count === 1 ? '' : 's'}`
  return [
    'Saved. The shop shows it on the next visit.',
    removed > 0 ? `${n(removed, 'colourway')} deleted.` : null,
    hidden > 0 ? `${n(hidden, 'ordered colourway')} hidden instead (kept for order history).` : null,
  ]
    .filter(Boolean)
    .join(' ')
}

/** A database refusal in words the owner can act on. */
export function explainCatalogueError(message: string): string {
  const code = message.match(/^([A-Z_]+)/)?.[1] ?? ''
  if (code === 'INVALID_VALUE') {
    const constraint = message.split(':')[1]?.trim() ?? ''
    return CONSTRAINTS[constraint] ?? `One of the values isn’t allowed (${constraint}).`
  }
  return MESSAGES[code] ?? `Couldn’t save: ${message}`
}
