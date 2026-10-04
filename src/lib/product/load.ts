import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { deliveryWindow } from '@/lib/delivery/window'
import { fromPrice } from '@/lib/catalogue/pricing'
import type { Piece, Shape } from '@/lib/catalogue/clean'
import { specRows, type SpecField } from './specs'
import type { DeliveryInfo, FabricCollectionView, ProductCardView, ProductPageData, SiblingView, VariantView } from './types'

/** Cache tags: the admin revalidates these when the catalogue or settings change (Phase 12). */
export const CATALOGUE_TAG = 'catalogue'
export const SETTINGS_TAG = 'settings'
const FIVE_MINUTES = 300

const PRODUCT_FIELDS = `
  id, slug, title, base_price, axis1_value, axis2_value, made_to_order, origin,
  width_cm, depth_cm, height_cm, side_a_cm, side_b_cm, dimensions_note,
  specifications, description, highlights, gallery_images, seo_title, seo_description,
  type:product_types(slug, name, spec_fields, material_kinds),
  range:ranges(id, slug, name, axis1_name, axis2_name),
  category:categories!products_primary_category_id_fkey(id, slug, name, parent:categories!categories_parent_id_fkey(slug, name)),
  variants:product_variants(id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort)
`

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort

/** A many-to-one embed, which the generated types sometimes describe as a list. */
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))

async function loadProductPage(slug: string): Promise<ProductPageData | null> {
  const db = createPublicClient()
  const { data: p, error } = await db.from('products').select(PRODUCT_FIELDS).eq('slug', slug).maybeSingle()
  if (error) throw new Error(`Product ${slug}: ${error.message}`)
  if (!p || !p.type) return null

  const specs = (p.specifications ?? {}) as Record<string, unknown>
  const variants: VariantView[] = [...p.variants].sort(bySort).map((v) => ({
    id: v.id,
    sku: v.sku,
    colourName: v.colour_name,
    colourHex: v.colour_hex,
    materialLabel: v.material_label,
    priceAdjustment: v.price_adjustment,
    image: v.image_url,
  }))

  const [siblings, fabrics, related, reviews] = await Promise.all([
    p.range
      ? db
          .from('products')
          .select('slug, axis1_value, axis2_value, base_price, made_to_order, sort, variants:product_variants(sku, colour_name, price_adjustment, sort)')
          .eq('range_id', p.range.id)
          .order('sort')
          .order('slug')
      : null,
    p.made_to_order && p.type.material_kinds.length
      ? db
          .from('material_collections')
          .select('slug, name, surcharge, sort, materials(id, code, name, hex, image_url, sort, is_swatchable)')
          .in('kind', p.type.material_kinds)
          .order('sort')
      : null,
    p.category
      ? db
          .from('products')
          .select('slug, title, base_price, sort, range_id, variants:product_variants(colour_name, price_adjustment, image_url, sort)')
          .eq('primary_category_id', p.category.id)
          .neq('slug', slug)
          .order('sort')
          .limit(80)
      : null,
    db.from('reviews').select('customer_name, rating, title, comment, created_at').eq('product_id', p.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(20),
  ])
  for (const r of [siblings, fabrics, related, reviews]) if (r?.error) throw new Error(`Product ${slug}: ${r.error.message}`)

  const siblingViews: SiblingView[] = (siblings?.data ?? []).map((s) => ({
    slug: s.slug,
    axis1Value: s.axis1_value,
    axis2Value: s.axis2_value,
    basePrice: s.base_price,
    madeToOrder: s.made_to_order,
    variants: [...s.variants].sort(bySort).map((v) => ({ sku: v.sku, colourName: v.colour_name, priceAdjustment: v.price_adjustment })),
  }))

  const fabricViews: FabricCollectionView[] = (fabrics?.data ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      surcharge: c.surcharge,
      fabrics: [...c.materials]
        .filter((m) => m.is_swatchable)
        .sort(bySort)
        .map((m) => ({ id: m.id, code: m.code, name: m.name, hex: m.hex, image: m.image_url })),
    }))
    .filter((c) => c.fabrics.length > 0)

  // One piece from each other range in the same category, cheapest first within the range order.
  const seenRanges = new Set<string>([p.range?.id ?? ''])
  const relatedViews: ProductCardView[] = []
  for (const r of related?.data ?? []) {
    const key = r.range_id ?? r.slug
    if (seenRanges.has(key) || relatedViews.length >= 8) continue
    seenRanges.add(key)
    const vs = [...r.variants].sort(bySort)
    const shown = vs.find((v) => v.image_url) ?? vs[0]
    relatedViews.push({
      slug: r.slug,
      title: r.title,
      price: fromPrice(r.base_price, vs.map((v) => v.price_adjustment)),
      image: shown?.image_url ?? null,
      imageAlt: shown?.colour_name ? `${r.title} in ${shown.colour_name}` : r.title,
    })
  }

  const material = typeof specs.material === 'string' ? specs.material : ''
  const parent = one(p.category?.parent)
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    typeSlug: p.type.slug,
    typeName: p.type.name,
    basePrice: p.base_price,
    madeToOrder: p.made_to_order,
    madeInUk: p.origin === 'uk',
    shape: (typeof specs.shape === 'string' ? specs.shape : null) as Shape | null,
    seats: typeof specs.seats === 'number' ? specs.seats : null,
    dimensions: { width_cm: p.width_cm, depth_cm: p.depth_cm, height_cm: p.height_cm, side_a_cm: p.side_a_cm, side_b_cm: p.side_b_cm },
    pieces: Array.isArray(specs.pieces) ? (specs.pieces as Piece[]) : [],
    dimensionsNote: p.dimensions_note,
    description: p.description,
    highlights: p.highlights,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    gallery: p.gallery_images,
    specs: specRows(p.type.spec_fields as unknown as SpecField[], specs, { madeToOrder: p.made_to_order, madeInUk: p.origin === 'uk' }),
    coverKind: /leather|pvc|vinyl/i.test(material) ? 'other' : 'fabric',
    range: p.range ? { slug: p.range.slug, name: p.range.name, axis1Name: p.range.axis1_name, axis2Name: p.range.axis2_name } : null,
    axis1Value: p.axis1_value,
    axis2Value: p.axis2_value,
    category: p.category
      ? { slug: p.category.slug, name: p.category.name, parent: parent ? { slug: parent.slug, name: parent.name } : null }
      : null,
    variants,
    siblings: siblingViews,
    fabrics: fabricViews,
    related: relatedViews,
    reviews: (reviews.data ?? []).map((r) => ({ name: r.customer_name, rating: r.rating, title: r.title, comment: r.comment, date: r.created_at })),
  }
}

export const getProductPage = unstable_cache(loadProductPage, ['product-page-v1'], { revalidate: FIVE_MINUTES, tags: [CATALOGUE_TAG] })

const loadDeliverySettings = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient()
      .from('shop_settings')
      .select(
        'upstairs_first_floor, upstairs_per_extra_floor, assembly_fee, removal_per_seat, delivery_min_working_days, delivery_max_working_days, preferred_date_min_days, preferred_date_max_days',
      )
      .single()
    if (error) throw new Error(`Shop settings: ${error.message}`)
    return data
  },
  ['delivery-settings-v1'],
  { revalidate: FIVE_MINUTES, tags: [SETTINGS_TAG] },
)

/** Delivery prices and today's delivery window (worked out per request, so the dates are always today's). */
export async function getDeliveryInfo(now = new Date()): Promise<DeliveryInfo> {
  const s = await loadDeliverySettings()
  return {
    windowLabel: deliveryWindow(s, now).label,
    minDays: s.delivery_min_working_days,
    maxDays: s.delivery_max_working_days,
    upstairsFirstFloor: s.upstairs_first_floor,
    upstairsPerExtraFloor: s.upstairs_per_extra_floor,
    assemblyFee: s.assembly_fee,
    removalPerSeat: s.removal_per_seat,
  }
}
