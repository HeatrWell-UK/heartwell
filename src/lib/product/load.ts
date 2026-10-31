import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { cloudinaryVideo } from '@/lib/videos'
import { CATALOGUE_TAG, getCategories } from '@/lib/catalogue/listing'
import { deliveryWindow, earliestPreferredDate, latestPreferredDate, londonToday } from '@/lib/delivery/window'
import type { DeliverySettings } from '@/lib/delivery/pricing'
import type { DeliveryArea } from '@/lib/delivery/areas'
import { fromPrice } from '@/lib/catalogue/pricing'
import type { Piece, Shape } from '@/lib/catalogue/clean'
import type { OfferTier } from '@/lib/offers/paid'
import { specRows, type SpecField } from './specs'
import { closeUpSources, type CloseUpPhoto } from './close-ups'
import { leadColourway } from '@/lib/catalogue/lead'
import type { AreaDelivery, DeliveryInfo, FabricCollectionView, ProductCardView, ProductPageData, SiblingView, VariantView } from './types'

/** Cache tag for shop settings; the catalogue's is CATALOGUE_TAG. The admin revalidates both (Phase 12). */
export const SETTINGS_TAG = 'settings'
const FIVE_MINUTES = 300

const PRODUCT_FIELDS = `
  id, slug, title, base_price, was_price, axis1_value, axis2_value, made_to_order, origin,
  width_cm, depth_cm, height_cm, side_a_cm, side_b_cm, dimensions_note,
  specifications, description, highlights, gallery_images, seo_title, seo_description, review_count, average_rating,
  type:product_types(slug, name, spec_fields, material_kinds),
  range:ranges(id, slug, name, axis1_name, axis2_name),
  category:categories!products_primary_category_id_fkey(id, slug, name, parent_id),
  variants:product_variants(id, sku, colour_name, colour_hex, material_label, price_adjustment, image_url, sort),
  tier:offer_product_tiers(tier)
`

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort

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

  const [siblings, fabrics, related, reviews, categories, videos] = await Promise.all([
    p.range
      ? db
          .from('products')
          .select(
            'slug, axis1_value, axis2_value, base_price, made_to_order, sort, variants:product_variants(sku, colour_name, material_label, price_adjustment, image_url, is_active, sort)',
          )
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
          .select('slug, title, base_price, was_price, sort, range_id, variants:product_variants(sku, colour_name, colour_hex, price_adjustment, image_url, sort)')
          .eq('primary_category_id', p.category.id)
          .neq('slug', slug)
          .order('sort')
          .limit(80)
      : null,
    db.from('reviews').select('customer_name, rating, title, comment, created_at').eq('product_id', p.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(20),
    getCategories(),
    db.from('videos').select('url, caption, kind, sort').eq('product_id', p.id).eq('is_active', true).order('sort').limit(6),
  ])
  for (const r of [siblings, fabrics, related, reviews, videos]) if (r?.error) throw new Error(`Product ${slug}: ${r.error.message}`)

  const siblingViews: SiblingView[] = (siblings?.data ?? []).map((s) => ({
    slug: s.slug,
    axis1Value: s.axis1_value,
    axis2Value: s.axis2_value,
    basePrice: s.base_price,
    madeToOrder: s.made_to_order,
    variants: [...s.variants].sort(bySort).map((v) => ({ sku: v.sku, colourName: v.colour_name, priceAdjustment: v.price_adjustment })),
  }))

  // Close-ups are cut from a piece of the same range, so its photos come with the sizes above.
  const photosOf = (pieceSlug: string): CloseUpPhoto[] =>
    [...(siblings?.data?.find((s) => s.slug === pieceSlug)?.variants ?? [])]
      .sort(bySort)
      .flatMap((v) => (v.is_active && v.image_url ? [{ colour: v.colour_name, material: v.material_label, src: v.image_url }] : []))

  const fabricViews: FabricCollectionView[] = (fabrics?.data ?? [])
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      surcharge: c.surcharge,
      fabrics: [...c.materials].sort(bySort).map((m) => ({ id: m.id, code: m.code, name: m.name, hex: m.hex, image: m.image_url })),
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
    const shown = leadColourway(vs, (v) => ({ sku: v.sku, hex: v.colour_hex, image: v.image_url }))
    const adjustments = vs.map((v) => v.price_adjustment)
    relatedViews.push({
      slug: r.slug,
      title: r.title,
      price: fromPrice(r.base_price, adjustments),
      wasPrice: r.was_price === null ? null : fromPrice(r.was_price, adjustments),
      image: shown?.image_url ?? null,
      imageAlt: shown?.colour_name ? `${r.title} in ${shown.colour_name}` : r.title,
    })
  }

  const material = typeof specs.material === 'string' ? specs.material : ''
  const parent = p.category?.parent_id ? (categories.find((c) => c.id === p.category?.parent_id) ?? null) : null
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    typeSlug: p.type.slug,
    typeName: p.type.name,
    basePrice: p.base_price,
    wasPrice: p.was_price,
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
    closeUps: closeUpSources(p.range?.slug ?? null, p.slug, photosOf),
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
    videos: (videos.data ?? []).flatMap((v) => {
      const video = cloudinaryVideo(v.url)
      return video ? [{ mp4: video.mp4, poster: video.poster, caption: v.caption, fromCustomer: v.kind === 'customer' }] : []
    }),
    reviewStats: p.review_count > 0 ? { count: p.review_count, average: Number(p.average_rating) } : null,
    offerTier: ((Array.isArray(p.tier) ? p.tier[0] : p.tier)?.tier ?? null) as OfferTier | null,
  }
}

export const getProductPage = unstable_cache(loadProductPage, ['product-page-v6'], { revalidate: FIVE_MINUTES, tags: [CATALOGUE_TAG] })

const loadDeliverySettings = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient()
      .from('shop_settings')
      .select(
        'upstairs_first_floor, upstairs_per_extra_floor, max_floor, assembly_fee, removal_per_seat, removal_min_seats, removal_max_seats, removal_default_seats, delivery_min_working_days, delivery_max_working_days, preferred_date_min_days, preferred_date_max_days, no_delivery_days',
      )
      .single()
    if (error) throw new Error(`Shop settings: ${error.message}`)
    return data
  },
  ['delivery-settings-v3'],
  { revalidate: FIVE_MINUTES, tags: [SETTINGS_TAG] },
)

/** The mainland areas that pay a delivery charge (delivery_areas), in their display order. */
export const getDeliveryAreas = unstable_cache(
  async (): Promise<DeliveryArea[]> => {
    const { data, error } = await createPublicClient()
      .from('delivery_areas')
      .select('slug, name, places, charge, min_working_days, max_working_days, districts, sort')
      .order('sort')
      .order('slug')
    if (error) throw new Error(`Delivery areas: ${error.message}`)
    return data.map((a) => ({
      slug: a.slug,
      name: a.name,
      places: a.places,
      charge: Number(a.charge),
      minWorkingDays: a.min_working_days,
      maxWorkingDays: a.max_working_days,
      districts: a.districts,
    }))
  },
  ['delivery-areas-v1'],
  { revalidate: FIVE_MINUTES, tags: [SETTINGS_TAG] },
)

/** Each charged area with today's window and first preferred day. */
async function areaDeliveries(s: Awaited<ReturnType<typeof loadDeliverySettings>>, now: Date): Promise<AreaDelivery[]> {
  return (await getDeliveryAreas()).map((a) => ({
    ...a,
    windowLabel: deliveryWindow(s, now, a).label,
    earliestDate: earliestPreferredDate(s, now, a),
  }))
}

/**
 * Delivery prices and today's delivery window. Cached pages carry the day the
 * dates are for and the rules behind them, so the browser can bring them up to
 * date (src/lib/delivery/fresh.ts).
 */
export async function getDeliveryInfo(now = new Date()): Promise<DeliveryInfo> {
  const s = await loadDeliverySettings()
  return {
    day: londonToday(now).toISOString().slice(0, 10),
    settings: {
      delivery_min_working_days: s.delivery_min_working_days,
      delivery_max_working_days: s.delivery_max_working_days,
      preferred_date_min_days: s.preferred_date_min_days,
      preferred_date_max_days: s.preferred_date_max_days,
      no_delivery_days: s.no_delivery_days,
    },
    windowLabel: deliveryWindow(s, now).label,
    minDays: s.delivery_min_working_days,
    maxDays: s.delivery_max_working_days,
    upstairsFirstFloor: s.upstairs_first_floor,
    upstairsPerExtraFloor: s.upstairs_per_extra_floor,
    assemblyFee: s.assembly_fee,
    removalPerSeat: s.removal_per_seat,
    areas: await areaDeliveries(s, now),
    noDeliveryDays: s.no_delivery_days,
  }
}

export interface CheckoutSettings {
  delivery: DeliverySettings
  windowLabel: string
  earliestDate: string
  latestDate: string
  areas: AreaDelivery[]
  noDeliveryDays: number[]
}

/** Everything checkout needs to price extras and offer delivery days, from shop_settings and delivery_areas. */
export async function getCheckoutSettings(now = new Date()): Promise<CheckoutSettings> {
  const s = await loadDeliverySettings()
  return {
    areas: await areaDeliveries(s, now),
    noDeliveryDays: s.no_delivery_days,
    delivery: {
      upstairs_first_floor: s.upstairs_first_floor,
      upstairs_per_extra_floor: s.upstairs_per_extra_floor,
      max_floor: s.max_floor,
      assembly_fee: s.assembly_fee,
      removal_per_seat: s.removal_per_seat,
      removal_min_seats: s.removal_min_seats,
      removal_max_seats: s.removal_max_seats,
      removal_default_seats: s.removal_default_seats,
    },
    windowLabel: deliveryWindow(s, now).label,
    earliestDate: earliestPreferredDate(s, now),
    latestDate: latestPreferredDate(s, now),
  }
}

/** How many fabric samples one request may ask for (shop_settings.sample_limit). */
export const getSampleLimit = unstable_cache(
  async (): Promise<number> => {
    const { data, error } = await createPublicClient().from('shop_settings').select('sample_limit').single()
    if (error) throw new Error(`Shop settings: ${error.message}`)
    return data.sample_limit
  },
  ['sample-limit-v1'],
  { revalidate: FIVE_MINUTES, tags: [SETTINGS_TAG] },
)
