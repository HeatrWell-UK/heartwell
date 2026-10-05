import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { fromPrice } from './pricing'
import { categoryHref, childrenOf, type CategoryNode } from './tree'
import type { ListingProduct } from './listing-types'

/** Cache tag the admin revalidates when the catalogue changes (Phase 12). */
export const CATALOGUE_TAG = 'catalogue'
const FIVE_MINUTES = 300

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))

/**
 * The whole category tree. Small, and read on every page (menu, footer,
 * breadcrumbs). Empty when the database isn't configured (a local build).
 */
export const getCategories = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    if (!SUPABASE_CONFIGURED) return []
    const { data, error } = await createPublicClient()
      .from('categories')
      .select('id, slug, name, parent_id, sort, description, seo_title, seo_description, image_url')
      .order('sort')
    if (error) throw new Error(`Categories: ${error.message}`)
    return data.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      parentId: c.parent_id,
      sort: c.sort,
      description: c.description,
      seoTitle: c.seo_title,
      seoDescription: c.seo_description,
      imageUrl: c.image_url,
    }))
  },
  ['categories-v2'],
  { revalidate: FIVE_MINUTES, tags: [CATALOGUE_TAG] },
)

/** Every live product, as category pages, search and the home page need it. */
export const getListing = unstable_cache(
  async (): Promise<ListingProduct[]> => {
    if (!SUPABASE_CONFIGURED) return []
    const { data, error } = await createPublicClient()
      .from('products')
      .select(
        `slug, title, base_price, made_to_order, origin, is_featured, sort, width_cm, axis1_value, axis2_value, specifications,
         type:product_types(slug, name, filters),
         range:ranges(slug, name, sort),
         product_categories(category_id),
         variants:product_variants(sku, colour_name, colour_hex, price_adjustment, image_url, sort)`,
      )
      .order('sort')
    if (error) throw new Error(`Listing: ${error.message}`)
    return data.map((p) => {
      const specs = (p.specifications ?? {}) as Record<string, unknown>
      const type = one(p.type)
      const range = one(p.range)
      const variants = [...p.variants].sort(bySort)
      const shown = variants.find((v) => v.image_url) ?? variants[0]
      return {
        slug: p.slug,
        title: p.title,
        typeSlug: type?.slug ?? 'sofa',
        typeName: type?.name ?? 'Sofa',
        typeFilters: Array.isArray(type?.filters) ? (type.filters as string[]) : [],
        rangeSlug: range?.slug ?? null,
        rangeName: range?.name ?? null,
        rangeSort: range?.sort ?? 999,
        sort: p.sort,
        featured: p.is_featured,
        madeToOrder: p.made_to_order,
        madeInUk: p.origin === 'uk',
        price: fromPrice(p.base_price, variants.map((v) => v.price_adjustment)),
        widthCm: p.width_cm,
        shape: typeof specs.shape === 'string' ? specs.shape : null,
        seats: typeof specs.seats === 'number' ? specs.seats : null,
        material: typeof specs.material === 'string' ? specs.material : null,
        reclining: typeof specs.reclining === 'string' ? specs.reclining : null,
        axis1Value: p.axis1_value,
        axis2Value: p.axis2_value,
        categoryIds: p.product_categories.map((pc) => pc.category_id),
        image: shown?.image_url ?? null,
        imageAlt: shown?.colour_name ? `${p.title} in ${shown.colour_name.toLowerCase()}` : p.title,
        colours: variants.filter((v) => v.colour_name).map((v) => ({ name: v.colour_name!, hex: v.colour_hex })),
      }
    })
  },
  ['listing-v1'],
  { revalidate: FIVE_MINUTES, tags: [CATALOGUE_TAG] },
)

export interface NavSection {
  title: string
  links: { label: string; href: string }[]
}

/** The shop part of the menu and footer, from the category tree: one section per department. */
export async function getShopNavigation(): Promise<NavSection[]> {
  const tree = await getCategories()
  return childrenOf(tree, null).map((dept) => ({
    title: `Shop ${dept.name.toLowerCase()}`,
    links: [
      ...childrenOf(tree, dept.id).map((c) => ({ label: sentenceCase(c.name), href: categoryHref(tree, c) })),
      { label: `All ${dept.name.toLowerCase()}`, href: categoryHref(tree, dept) },
    ],
  }))
}

/** "Corner Sofas" -> "Corner sofas", keeping "3+2" and "U-Shaped" readable. */
export function sentenceCase(name: string): string {
  return name.replace(/(\s)([A-Z])([a-z])/g, (_, s: string, c: string, rest: string) => `${s}${c.toLowerCase()}${rest}`)
}

export interface FabricCollection {
  slug: string
  name: string
  surcharge: number
  fabrics: { code: string; name: string; hex: string | null; image: string | null }[]
}

/** The fabric library for made-to-order pieces, in display order. */
export const getFabricLibrary = unstable_cache(
  async (): Promise<FabricCollection[]> => {
    if (!SUPABASE_CONFIGURED) return []
    const { data, error } = await createPublicClient()
      .from('material_collections')
      .select('slug, name, surcharge, sort, materials(code, name, hex, image_url, sort, is_swatchable)')
      .order('sort')
    if (error) throw new Error(`Fabrics: ${error.message}`)
    return data
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        surcharge: c.surcharge,
        fabrics: [...c.materials]
          .filter((m) => m.is_swatchable)
          .sort(bySort)
          .map((m) => ({ code: m.code, name: m.name, hex: m.hex, image: m.image_url })),
      }))
      .filter((c) => c.fabrics.length > 0)
  },
  ['fabric-library-v1'],
  { revalidate: FIVE_MINUTES, tags: [CATALOGUE_TAG] },
)

export interface RangeSummary {
  slug: string
  name: string
  products: ListingProduct[]
  price: number
  image: string | null
  imageAlt: string
  madeToOrder: boolean
  colours: { name: string; hex: string | null }[]
}

/** Ranges (Verona, Ashton…) built from the listing: their pieces, lowest price and colours. */
export function rangesFrom(listing: ListingProduct[]): RangeSummary[] {
  const groups = new Map<string, ListingProduct[]>()
  for (const p of listing) {
    if (!p.rangeSlug) continue
    groups.set(p.rangeSlug, [...(groups.get(p.rangeSlug) ?? []), p])
  }
  return [...groups.values()]
    .sort((a, b) => (a[0]?.rangeSort ?? 0) - (b[0]?.rangeSort ?? 0))
    .map((products) => {
      const sorted = [...products].sort((a, b) => a.sort - b.sort)
      const cover = sorted.find((p) => p.featured && p.image) ?? sorted.find((p) => p.image) ?? sorted[0]!
      const colours = new Map<string, string | null>()
      for (const p of sorted) for (const c of p.colours) if (!colours.has(c.name)) colours.set(c.name, c.hex)
      return {
        slug: cover.rangeSlug!,
        name: cover.rangeName!,
        products: sorted,
        price: Math.min(...sorted.map((p) => p.price)),
        image: cover.image,
        imageAlt: cover.imageAlt,
        madeToOrder: sorted.some((p) => p.madeToOrder),
        colours: [...colours].map(([name, hex]) => ({ name, hex })),
      }
    })
}
