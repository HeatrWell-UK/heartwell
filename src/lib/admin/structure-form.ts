// The catalogue's structure as the admin edits it: product types (with their
// Specifications fields and filters), categories, ranges, and the fabric and
// material library. Pure: drafts, checks and the rows the database stores.

import { FILTER_KEYS, GROUP_LABEL } from '@/lib/catalogue/filters'
import { newKey, SPEC_KINDS, type SpecFieldDef, type SpecKind } from './catalogue-form'

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SPEC_KEY = /^[a-z][a-z0-9_]{0,39}$/
const HEX = /^#[0-9A-Fa-f]{6}$/
const MONEY = /^\d{1,5}(\.\d{1,2})?$/
const SORT = /^\d{1,4}$/

export const MATERIAL_KINDS = ['fabric', 'leather', 'wood', 'metal', 'other'] as const
export type MaterialKind = (typeof MATERIAL_KINDS)[number]
export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = { fabric: 'Fabric', leather: 'Leather', wood: 'Wood', metal: 'Metal', other: 'Other (faux leather, PVC)' }

export const REMOVAL_UNITS = [
  { value: 'seat', label: 'Per seat (sofas, armchairs)' },
  { value: 'item', label: 'Per item (footstools, tables, beds)' },
  { value: 'none', label: 'We don’t take the old one away' },
] as const

export const SPEC_KIND_LABEL: Record<SpecKind, string> = {
  text: 'Words',
  number: 'Number',
  boolean: 'Yes / no',
  pieces: 'Pieces (sets)',
}

export const FILTER_OPTIONS = FILTER_KEYS.map((key) => ({ key, label: GROUP_LABEL[key] }))

/** The filters that read a Specifications field; the rest work for any product. */
export const FILTER_NEEDS_SPEC: Partial<Record<(typeof FILTER_KEYS)[number], string>> = { shape: 'shape', seats: 'seats', material: 'material', reclining: 'reclining' }

const blank = (s: string) => s.trim() === ''
const orNull = (s: string) => (blank(s) ? null : s.trim())

// Product types --------------------------------------------------------------

export interface SpecFieldDraft {
  rowKey: string
  key: string
  label: string
  kind: SpecKind
  /** Comma-separated; text fields only. */
  options: string
}

export interface TypeDraft {
  id: string | null
  slug: string
  name: string
  namePlural: string
  specFields: SpecFieldDraft[]
  filters: string[]
  materialKinds: string[]
  removalUnit: 'seat' | 'item' | 'none'
  googleCategory: string
  metaCategory: string
  sizeGuide: string
  sort: string
}

export interface TypeRow {
  id: string
  slug: string
  name: string
  name_plural: string
  spec_fields: unknown
  filters: unknown
  material_kinds: string[]
  removal_unit: string
  google_product_category: string | null
  meta_product_category: string | null
  size_guide: string | null
  sort: number
}

/** spec_fields as stored, tolerating anything odd. */
export function readSpecFields(raw: unknown): SpecFieldDef[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((f) => {
    if (!f || typeof f !== 'object') return []
    const { key, label, kind, options } = f as Record<string, unknown>
    if (typeof key !== 'string' || typeof label !== 'string') return []
    const k = SPEC_KINDS.find((x) => x === kind) ?? 'text'
    const opts = Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string' && o.trim() !== '') : []
    return [{ key, label, kind: k, ...(k === 'text' && opts.length ? { options: opts } : {}) }]
  })
}

export const emptySpecField = (): SpecFieldDraft => ({ rowKey: newKey(), key: '', label: '', kind: 'text', options: '' })

export function emptyTypeDraft(): TypeDraft {
  return {
    id: null,
    slug: '',
    name: '',
    namePlural: '',
    specFields: [
      { ...emptySpecField(), key: 'material', label: 'Material' },
      { ...emptySpecField(), key: 'finish', label: 'Finish' },
    ],
    filters: ['price', 'colour', 'width'],
    materialKinds: [],
    removalUnit: 'item',
    googleCategory: '',
    metaCategory: '',
    sizeGuide: '',
    sort: '99',
  }
}

export function typeDraftFromRow(row: TypeRow): TypeDraft {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    namePlural: row.name_plural,
    specFields: readSpecFields(row.spec_fields).map((f) => ({ rowKey: newKey(), key: f.key, label: f.label, kind: f.kind, options: (f.options ?? []).join(', ') })),
    filters: Array.isArray(row.filters) ? row.filters.filter((x): x is string => typeof x === 'string') : [],
    materialKinds: row.material_kinds,
    removalUnit: row.removal_unit === 'item' || row.removal_unit === 'none' ? row.removal_unit : 'seat',
    googleCategory: row.google_product_category ?? '',
    metaCategory: row.meta_product_category ?? '',
    sizeGuide: row.size_guide ?? '',
    sort: String(row.sort),
  }
}

export function checkType(d: TypeDraft): string[] {
  const problems: string[] = []
  if (!SLUG.test(d.slug)) problems.push('The short name can use small letters, numbers and single hyphens, e.g. coffee-table.')
  if (blank(d.name)) problems.push('Give the type a name, e.g. Coffee table.')
  if (blank(d.namePlural)) problems.push('Give the plural, e.g. Coffee tables.')
  if (!SORT.test(d.sort.trim())) problems.push('The order is a whole number.')
  const keys = new Set<string>()
  d.specFields.forEach((f, i) => {
    const n = `Field ${i + 1}`
    if (!SPEC_KEY.test(f.key)) problems.push(`${n}: the key uses small letters, numbers and underscores, starting with a letter (e.g. top_material).`)
    else if (keys.has(f.key)) problems.push(`${n}: the key ${f.key} is used twice.`)
    keys.add(f.key)
    if (blank(f.label)) problems.push(`${n}: give it a label customers will read.`)
  })
  if (d.specFields.filter((f) => f.kind === 'pieces').length > 1) problems.push('Only one Pieces field per type.')
  for (const filter of d.filters) {
    if (!FILTER_KEYS.includes(filter as (typeof FILTER_KEYS)[number])) problems.push(`Unknown filter: ${filter}.`)
  }
  return problems
}

/** Filters that won't find anything because the type has no field they read. */
export function filtersWithoutFields(d: Pick<TypeDraft, 'filters' | 'specFields'>): string[] {
  const keys = new Set(d.specFields.map((f) => f.key))
  return d.filters.filter((f) => {
    const needs = FILTER_NEEDS_SPEC[f as keyof typeof FILTER_NEEDS_SPEC]
    return needs !== undefined && !keys.has(needs)
  })
}

export function typeRow(d: TypeDraft) {
  return {
    slug: d.slug.trim(),
    name: d.name.trim(),
    name_plural: d.namePlural.trim(),
    spec_fields: d.specFields.map((f) => {
      const options = f.kind === 'text' ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : []
      return { key: f.key.trim(), label: f.label.trim(), kind: f.kind, ...(options.length ? { options } : {}) }
    }),
    filters: FILTER_KEYS.filter((k) => d.filters.includes(k)),
    material_kinds: MATERIAL_KINDS.filter((k) => d.materialKinds.includes(k)),
    removal_unit: d.removalUnit,
    google_product_category: orNull(d.googleCategory),
    meta_product_category: orNull(d.metaCategory),
    size_guide: orNull(d.sizeGuide),
    sort: Number(d.sort.trim()),
  }
}

// Categories -----------------------------------------------------------------

export interface CategoryDraft {
  id: string | null
  slug: string
  name: string
  parentId: string
  description: string
  seoTitle: string
  seoDescription: string
  imageUrl: string
  sort: string
  isActive: boolean
}

export interface CategoryRow {
  id: string
  slug: string
  name: string
  parent_id: string | null
  description: string | null
  seo_title: string | null
  seo_description: string | null
  image_url: string | null
  sort: number
  is_active: boolean
}

export const emptyCategoryDraft = (parentId = ''): CategoryDraft => ({
  id: null,
  slug: '',
  name: '',
  parentId,
  description: '',
  seoTitle: '',
  seoDescription: '',
  imageUrl: '',
  sort: '99',
  isActive: true,
})

export const categoryDraftFromRow = (r: CategoryRow): CategoryDraft => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  parentId: r.parent_id ?? '',
  description: r.description ?? '',
  seoTitle: r.seo_title ?? '',
  seoDescription: r.seo_description ?? '',
  imageUrl: r.image_url ?? '',
  sort: String(r.sort),
  isActive: r.is_active,
})

export function checkCategory(d: CategoryDraft): string[] {
  const problems: string[] = []
  if (blank(d.name)) problems.push('Give the category a name.')
  if (!SLUG.test(d.slug)) problems.push('The web address can use small letters, numbers and single hyphens only.')
  if (!SORT.test(d.sort.trim())) problems.push('The order is a whole number.')
  if (d.id && d.parentId === d.id) problems.push('A category can’t sit inside itself.')
  if (!blank(d.imageUrl) && !/^https:\/\/res\.cloudinary\.com\//.test(d.imageUrl.trim())) problems.push('The photo must be a Cloudinary image link.')
  if (d.seoTitle.length > 120) problems.push('The search title is at most 120 characters.')
  if (d.seoDescription.length > 320) problems.push('The search description is at most 320 characters.')
  return problems
}

export const categoryRow = (d: CategoryDraft) => ({
  slug: d.slug.trim(),
  name: d.name.trim(),
  parent_id: d.parentId || null,
  description: orNull(d.description),
  seo_title: orNull(d.seoTitle),
  seo_description: orNull(d.seoDescription),
  image_url: orNull(d.imageUrl),
  sort: Number(d.sort.trim()),
  is_active: d.isActive,
})

/** Categories in tree order with their depth, for lists and the parent dropdown. */
export function categoryTree<T extends { id: string; parent_id: string | null; sort: number; name: string }>(rows: T[]): (T & { depth: number })[] {
  const out: (T & { depth: number })[] = []
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    rows
      .filter((r) => r.parent_id === parent)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
      .forEach((r) => {
        if (seen.has(r.id)) return
        seen.add(r.id)
        out.push({ ...r, depth })
        walk(r.id, depth + 1, seen)
      })
  }
  walk(null, 0, new Set())
  return out
}

/** A category and everything below it (not allowed as its new parent). */
export function descendantsOf(rows: { id: string; parent_id: string | null }[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const r of rows) {
      if (r.parent_id && out.has(r.parent_id) && !out.has(r.id)) {
        out.add(r.id)
        grew = true
      }
    }
  }
  return out
}

// Ranges ---------------------------------------------------------------------

export interface RangeDraft {
  id: string | null
  slug: string
  name: string
  tradeName: string
  axis1Name: string
  axis2Name: string
  description: string
  sort: string
  isActive: boolean
}

export interface RangeRow {
  id: string
  slug: string
  name: string
  trade_name: string | null
  axis1_name: string
  axis2_name: string | null
  description: string | null
  sort: number
  is_active: boolean
}

export const emptyRangeDraft = (): RangeDraft => ({ id: null, slug: '', name: '', tradeName: '', axis1Name: 'Size', axis2Name: '', description: '', sort: '99', isActive: true })

export const rangeDraftFromRow = (r: RangeRow): RangeDraft => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  tradeName: r.trade_name ?? '',
  axis1Name: r.axis1_name,
  axis2Name: r.axis2_name ?? '',
  description: r.description ?? '',
  sort: String(r.sort),
  isActive: r.is_active,
})

export function checkRange(d: RangeDraft): string[] {
  const problems: string[] = []
  if (blank(d.name)) problems.push('Give the range a name.')
  if (!SLUG.test(d.slug)) problems.push('The web address can use small letters, numbers and single hyphens only.')
  if (blank(d.axis1Name)) problems.push('Name the first option, usually Size.')
  if (!SORT.test(d.sort.trim())) problems.push('The order is a whole number.')
  return problems
}

export const rangeRow = (d: RangeDraft) => ({
  slug: d.slug.trim(),
  name: d.name.trim(),
  trade_name: orNull(d.tradeName),
  axis1_name: d.axis1Name.trim(),
  axis2_name: orNull(d.axis2Name),
  description: orNull(d.description),
  sort: Number(d.sort.trim()),
  is_active: d.isActive,
})

// Fabric and material library ---------------------------------------------------

export interface MaterialDraft {
  rowKey: string
  id: string | null
  code: string
  name: string
  hex: string
  imageUrl: string
  isActive: boolean
  isSwatchable: boolean
}

export interface CollectionDraft {
  id: string | null
  slug: string
  name: string
  kind: MaterialKind
  description: string
  supplier: string
  surcharge: string
  sort: string
  isActive: boolean
  materials: MaterialDraft[]
}

export interface CollectionRow {
  id: string
  slug: string
  name: string
  kind: string
  description: string | null
  supplier: string | null
  surcharge: number
  sort: number
  is_active: boolean
  materials: { id: string; code: string; name: string; hex: string | null; image_url: string | null; sort: number; is_active: boolean; is_swatchable: boolean }[]
}

export const emptyMaterial = (): MaterialDraft => ({ rowKey: newKey(), id: null, code: '', name: '', hex: '', imageUrl: '', isActive: true, isSwatchable: true })

export const emptyCollectionDraft = (): CollectionDraft => ({
  id: null,
  slug: '',
  name: '',
  kind: 'fabric',
  description: '',
  supplier: '',
  surcharge: '0',
  sort: '99',
  isActive: true,
  materials: [emptyMaterial()],
})

export const collectionDraftFromRow = (r: CollectionRow): CollectionDraft => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  kind: MATERIAL_KINDS.find((k) => k === r.kind) ?? 'other',
  description: r.description ?? '',
  supplier: r.supplier ?? '',
  surcharge: String(r.surcharge),
  sort: String(r.sort),
  isActive: r.is_active,
  materials: [...r.materials]
    .sort((a, b) => a.sort - b.sort)
    .map((m) => ({ rowKey: m.id, id: m.id, code: m.code, name: m.name, hex: m.hex ?? '', imageUrl: m.image_url ?? '', isActive: m.is_active, isSwatchable: m.is_swatchable })),
})

export function checkCollection(d: CollectionDraft): string[] {
  const problems: string[] = []
  if (blank(d.name)) problems.push('Give the collection a name.')
  if (!SLUG.test(d.slug)) problems.push('The short name can use small letters, numbers and single hyphens only.')
  if (!MONEY.test(d.surcharge.trim())) problems.push('The extra charge is in pounds, e.g. 0 or 50.')
  if (!SORT.test(d.sort.trim())) problems.push('The order is a whole number.')
  const codes = new Set<string>()
  d.materials.forEach((m, i) => {
    const n = `Colour ${i + 1}`
    if (blank(m.code)) problems.push(`${n}: enter its code.`)
    else if (codes.has(m.code.trim().toUpperCase())) problems.push(`${n}: the code ${m.code.trim()} is used twice.`)
    codes.add(m.code.trim().toUpperCase())
    if (blank(m.name)) problems.push(`${n}: give it a name.`)
    if (!blank(m.hex) && !HEX.test(m.hex.trim())) problems.push(`${n}: the colour code looks like #8A8D8F.`)
    if (!blank(m.imageUrl) && !/^https:\/\/res\.cloudinary\.com\//.test(m.imageUrl.trim())) problems.push(`${n}: the swatch photo must be a Cloudinary image link.`)
  })
  return problems
}

export const collectionRow = (d: CollectionDraft) => ({
  slug: d.slug.trim(),
  name: d.name.trim(),
  kind: d.kind,
  description: orNull(d.description),
  supplier: orNull(d.supplier),
  surcharge: Number(d.surcharge.trim()),
  sort: Number(d.sort.trim()),
  is_active: d.isActive,
})

export const materialRows = (d: CollectionDraft, collectionId: string) =>
  d.materials.map((m, i) => ({
    ...(m.id ? { id: m.id } : {}),
    collection_id: collectionId,
    code: m.code.trim(),
    name: m.name.trim(),
    hex: m.hex.trim() ? m.hex.trim().toUpperCase() : null,
    image_url: orNull(m.imageUrl),
    sort: i + 1,
    is_active: m.isActive,
    is_swatchable: m.isSwatchable,
  }))

/** Postgres refusals from the structure tables, in plain words. */
export function explainStructureError(message: string, code?: string): string {
  if (code === '23505' || /duplicate key/.test(message)) {
    if (/materials_collection_code/.test(message)) return 'Two colours in this collection share a code.'
    return 'That short name or web address is already used. Change it slightly.'
  }
  if (code === '23503' || /foreign key/.test(message)) {
    if (/products_product_type_id/.test(message)) return 'Products still use this type. Move them to another type first.'
    if (/products_primary_category_id/.test(message)) return 'Some products have this as their main category. Change them first, or hide the category.'
    if (/categories_parent_id/.test(message)) return 'This category has categories inside it. Move or delete those first.'
    return 'Something still uses this. Move it first, or hide it instead.'
  }
  if (/cycle/i.test(message)) return 'A category can’t sit inside one of its own subcategories.'
  if (code === '23514' || /check constraint/.test(message)) return `One of the values isn’t allowed (${message.match(/"([a-z_]+)"/)?.[1] ?? 'check'}).`
  if (code === '42501' || /row-level security|permission denied/.test(message)) return 'Please sign in again.'
  return `Couldn’t save: ${message}`
}
