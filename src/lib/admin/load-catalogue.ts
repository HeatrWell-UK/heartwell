import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { catalogueIssues, type CatalogueIssue } from '@/lib/catalogue/display'

const PRODUCT_FIELDS = `
  id, slug, title, base_price, axis1_value, axis2_value, made_to_order, origin, is_active, is_featured, sort,
  width_cm, depth_cm, height_cm, side_a_cm, side_b_cm, gallery_images,
  range:ranges(slug, name, sort),
  type:product_types(name),
  primary:categories!products_primary_category_id_fkey(name),
  variants:product_variants(sku, colour_name, colour_hex, image_url, price_adjustment, sort, is_active),
  product_categories(category:categories(slug, name)),
  tier:offer_product_tiers(tier)
`

const COLLECTION_FIELDS = 'slug, name, kind, sort, is_active, materials(code, name, hex, image_url, sort, is_active)'

/** The whole catalogue as the admin sees it (hidden rows included), grouped by range. */
export async function loadCatalogue() {
  const supabase = await createClient()
  const [products, collections] = await Promise.all([
    supabase.from('products').select(PRODUCT_FIELDS).order('sort').order('slug'),
    supabase.from('material_collections').select(COLLECTION_FIELDS).order('sort'),
  ])
  if (products.error) throw new Error(`Catalogue: ${products.error.message}`)
  if (collections.error) throw new Error(`Fabrics: ${collections.error.message}`)

  const rows = products.data.map((p) => {
    const variants = [...p.variants].sort((a, b) => a.sort - b.sort || a.sku.localeCompare(b.sku))
    const photo = p.gallery_images[0] ?? variants.find((v) => v.is_active && v.image_url)?.image_url ?? null
    return {
      ...p,
      variants,
      photo,
      categories: p.product_categories.map((pc) => pc.category?.name).filter((n): n is string => Boolean(n)).sort(),
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

  const materials = collections.data.flatMap((c) => c.materials)
  return {
    groups: [...groups.values()].sort((a, b) => a.sort - b.sort),
    collections: collections.data.map((c) => ({ ...c, materials: [...c.materials].sort((a, b) => a.sort - b.sort) })),
    totals: {
      products: rows.length,
      hidden: rows.filter((r) => !r.is_active).length,
      variants: rows.reduce((n, r) => n + r.variants.length, 0),
      materials: materials.length,
      collections: collections.data.length,
      needsAttention: rows.filter((r) => r.issues.length > 0).length,
    },
    attention: rows.filter((r) => r.issues.length > 0),
  }
}

export type CatalogueData = Awaited<ReturnType<typeof loadCatalogue>>
export type CatalogueRow = CatalogueData['groups'][number]['products'][number]
