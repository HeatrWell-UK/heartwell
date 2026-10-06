import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { catalogueIssues, type CatalogueIssue } from '@/lib/catalogue/display'
import { asRecord, type ProductRow } from './catalogue-form'
import { categoryTree, readSpecFields, type CategoryRow, type CollectionRow, type RangeRow, type TypeRow } from './structure-form'
import { UPLOADS_CONFIGURED } from './cloudinary'

// The catalogue as the admin sees it, read with the signed-in admin's
// session (row level security shows admins hidden rows too).

const PRODUCT_FIELDS = `
  id, slug, title, base_price, axis1_value, axis2_value, made_to_order, origin, is_active, is_featured, sort,
  width_cm, depth_cm, height_cm, side_a_cm, side_b_cm, gallery_images,
  range:ranges(slug, name, sort),
  type:product_types(slug, name),
  primary:categories!products_primary_category_id_fkey(name),
  variants:product_variants(sku, colour_name, colour_hex, image_url, price_adjustment, sort, is_active),
  product_categories(category:categories(slug, name)),
  tier:offer_product_tiers(tier)
`

/** The whole catalogue (hidden rows included), grouped by range. */
export async function loadCatalogue() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select(PRODUCT_FIELDS).order('sort').order('slug')
  if (error) throw new Error(`Catalogue: ${error.message}`)

  const rows = data.map((p) => {
    const variants = [...p.variants].sort((a, b) => a.sort - b.sort || a.sku.localeCompare(b.sku))
    const photo = p.gallery_images[0] ?? variants.find((v) => v.is_active && v.image_url)?.image_url ?? null
    return {
      ...p,
      variants,
      photo,
      categories: p.product_categories.map((pc) => pc.category?.name).filter((n): n is string => Boolean(n)).sort(),
      categorySlugs: p.product_categories.map((pc) => pc.category?.slug).filter((n): n is string => Boolean(n)),
      issues: catalogueIssues({ ...p, variants }) as CatalogueIssue[],
    }
  })

  const groups = new Map<string, { key: string; name: string; sort: number; products: typeof rows }>()
  for (const row of rows) {
    const key = row.range?.slug ?? '~standalone'
    const group = groups.get(key) ?? { key, name: row.range?.name ?? 'Not in a range', sort: row.range?.sort ?? 999, products: [] }
    group.products.push(row)
    groups.set(key, group)
  }

  return {
    rows,
    groups: [...groups.values()].sort((a, b) => a.sort - b.sort),
    totals: {
      products: rows.length,
      hidden: rows.filter((r) => !r.is_active).length,
      variants: rows.reduce((n, r) => n + r.variants.length, 0),
      needsAttention: rows.filter((r) => r.issues.length > 0).length,
    },
  }
}

export type CatalogueData = Awaited<ReturnType<typeof loadCatalogue>>
export type CatalogueRow = CatalogueData['rows'][number]

const EDIT_FIELDS = `
  id, updated_at, slug, title, trade_title, axis1_value, axis2_value, base_price, origin, made_to_order, is_featured, is_active, sort,
  width_cm, depth_cm, height_cm, seat_height_cm, seat_depth_cm, side_a_cm, side_b_cm, dimensions_note,
  specifications, description, highlights, seo_title, seo_description, gallery_images,
  type:product_types(slug), range:ranges(slug), primary:categories!products_primary_category_id_fkey(slug),
  variants:product_variants(id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort, is_active),
  product_categories(category:categories(slug)),
  tier:offer_product_tiers(tier)
`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** One product in the editor's shape, or null. */
export async function loadProduct(id: string): Promise<(ProductRow & { updated_at: string; orderedVariantIds: string[]; orderCount: number }) | null> {
  if (!UUID.test(id)) return null
  const supabase = await createClient()
  const [product, ordered] = await Promise.all([
    supabase.from('products').select(EDIT_FIELDS).eq('id', id).maybeSingle(),
    supabase.from('order_items').select('variant_id').eq('product_id', id).limit(1000),
  ])
  if (product.error) throw new Error(`Product ${id}: ${product.error.message}`)
  if (ordered.error) throw new Error(`Product ${id} orders: ${ordered.error.message}`)
  const p = product.data
  if (!p) return null
  return {
    ...p,
    categories: p.product_categories.map((pc) => pc.category?.slug).filter((s): s is string => Boolean(s)),
    tier: p.tier?.tier ?? null,
    orderedVariantIds: [...new Set(ordered.data.map((o) => o.variant_id).filter((v): v is string => Boolean(v)))],
    orderCount: ordered.data.length,
  }
}

/** Everything the product form chooses from. */
export async function loadEditorOptions() {
  const supabase = await createClient()
  const [types, ranges, categories, products, materials] = await Promise.all([
    supabase.from('product_types').select('id, slug, name, name_plural, spec_fields, material_kinds, sort').order('sort'),
    supabase.from('ranges').select('slug, name, axis1_name, axis2_name, is_active, sort').order('sort'),
    supabase.from('categories').select('id, slug, name, parent_id, sort, is_active'),
    supabase.from('products').select('specifications, axis1_value, axis2_value, gallery_images, variants:product_variants(image_url)'),
    supabase.from('materials').select('image_url').not('image_url', 'is', null),
  ])
  for (const r of [types, ranges, categories, products, materials]) if (r.error) throw new Error(`Editor options: ${r.error.message}`)

  // Values already in use, offered as suggestions so spellings stay consistent.
  const suggestions: Record<string, Set<string>> = {}
  const suggest = (key: string, v: unknown) => {
    if (typeof v !== 'string' && typeof v !== 'number') return
    const s = String(v).trim()
    if (s) (suggestions[key] ??= new Set()).add(s)
  }
  const images = new Set<string>()
  for (const p of products.data ?? []) {
    for (const [k, v] of Object.entries(asRecord(p.specifications))) suggest(`spec.${k}`, v)
    suggest('axis1', p.axis1_value)
    suggest('axis2', p.axis2_value)
    p.gallery_images.forEach((u) => images.add(u))
    p.variants.forEach((v) => v.image_url && images.add(v.image_url))
  }
  for (const m of materials.data ?? []) if (m.image_url) images.add(m.image_url)

  return {
    types: (types.data ?? []).map((t) => ({ slug: t.slug, name: t.name, plural: t.name_plural, fields: readSpecFields(t.spec_fields), materialKinds: t.material_kinds })),
    ranges: ranges.data ?? [],
    categories: categoryTree(categories.data ?? []),
    suggestions: Object.fromEntries(Object.entries(suggestions).map(([k, set]) => [k, [...set].sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true })).slice(0, 40)])),
    images: [...images],
    uploads: UPLOADS_CONFIGURED,
  }
}

export type EditorOptions = Awaited<ReturnType<typeof loadEditorOptions>>

/** Product types, categories, ranges and the material library, with how much uses each. */
export async function loadStructure() {
  const supabase = await createClient()
  const [types, categories, ranges, collections, products, links] = await Promise.all([
    supabase.from('product_types').select('id, slug, name, name_plural, spec_fields, filters, material_kinds, removal_unit, google_product_category, meta_product_category, size_guide, sort').order('sort'),
    supabase.from('categories').select('id, slug, name, parent_id, description, seo_title, seo_description, image_url, sort, is_active'),
    supabase.from('ranges').select('id, slug, name, trade_name, axis1_name, axis2_name, description, sort, is_active').order('sort'),
    supabase.from('material_collections').select('id, slug, name, kind, description, supplier, surcharge, sort, is_active, materials(id, code, name, hex, image_url, sort, is_active, is_swatchable)').order('sort'),
    supabase.from('products').select('product_type_id, range_id, primary_category_id'),
    supabase.from('product_categories').select('category_id'),
  ])
  for (const r of [types, categories, ranges, collections, products, links]) if (r.error) throw new Error(`Structure: ${r.error.message}`)

  const count = <K extends string>(rows: Record<K, string | null>[], key: K) => {
    const out = new Map<string, number>()
    for (const r of rows) if (r[key]) out.set(r[key]!, (out.get(r[key]!) ?? 0) + 1)
    return out
  }
  const byType = count(products.data ?? [], 'product_type_id')
  const byRange = count(products.data ?? [], 'range_id')
  const byPrimary = count(products.data ?? [], 'primary_category_id')
  const byCategory = count(links.data ?? [], 'category_id')

  const cats = categories.data ?? []
  return {
    types: (types.data ?? []).map((t) => ({ ...(t as TypeRow), products: byType.get(t.id) ?? 0 })),
    categories: categoryTree(cats).map((c) => ({
      ...(c as CategoryRow & { depth: number }),
      products: byCategory.get(c.id) ?? 0,
      primaryFor: byPrimary.get(c.id) ?? 0,
      children: cats.filter((x) => x.parent_id === c.id).length,
    })),
    ranges: (ranges.data ?? []).map((r) => ({ ...(r as RangeRow), products: byRange.get(r.id) ?? 0 })),
    collections: (collections.data ?? []) as CollectionRow[],
  }
}

export type StructureData = Awaited<ReturnType<typeof loadStructure>>

/** The shop settings row and the offer codes, with how many products sit in each tier. */
export async function loadSettings() {
  const supabase = await createClient()
  const [settings, codes, tiers] = await Promise.all([
    supabase.from('shop_settings').select('*').single(),
    supabase.from('offer_codes').select('code, label, is_active, created_at').order('created_at', { ascending: false }),
    supabase.from('offer_product_tiers').select('tier'),
  ])
  if (settings.error) throw new Error(`Settings: ${settings.error.message}`)
  if (codes.error) throw new Error(`Offer codes: ${codes.error.message}`)
  if (tiers.error) throw new Error(`Offer tiers: ${tiers.error.message}`)
  const tierCounts: Record<string, number> = {}
  for (const t of tiers.data) tierCounts[t.tier] = (tierCounts[t.tier] ?? 0) + 1
  return { settings: settings.data, codes: codes.data, tierCounts }
}

/** Photos already in Cloudinary that the catalogue uses, for the picker on the structure pages. */
export async function loadImageLibrary() {
  const supabase = await createClient()
  const [products, variants, categories, materials] = await Promise.all([
    supabase.from('products').select('gallery_images'),
    supabase.from('product_variants').select('image_url').not('image_url', 'is', null),
    supabase.from('categories').select('image_url').not('image_url', 'is', null),
    supabase.from('materials').select('image_url').not('image_url', 'is', null),
  ])
  for (const r of [products, variants, categories, materials]) if (r.error) throw new Error(`Photos: ${r.error.message}`)
  const images = new Set<string>()
  for (const p of products.data ?? []) p.gallery_images.forEach((u) => images.add(u))
  for (const r of [...(variants.data ?? []), ...(categories.data ?? []), ...(materials.data ?? [])]) if (r.image_url) images.add(r.image_url)
  return { images: [...images], uploads: UPLOADS_CONFIGURED }
}
