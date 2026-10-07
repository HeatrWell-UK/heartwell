// Reads the live catalogue for the product feeds (public data only: what the
// shop shows anyone), cached with the catalogue so an admin save shows in
// the next fetch. Recording who fetched a feed needs the server key.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import type { OfferTier } from '@/lib/offers/paid'
import { CATALOGUE_TAG, getCategories } from './listing'
import type { FeedAgent, FeedName, FeedProductRow } from './feed'

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))
const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort

const FIELDS = `
  id, slug, title, description, highlights, base_price, made_to_order, origin, specifications, sort,
  width_cm, depth_cm, height_cm, side_a_cm, side_b_cm, gallery_images, axis1_value, primary_category_id,
  type:product_types(name, google_product_category, meta_product_category),
  range:ranges(name),
  tier:offer_product_tiers(tier),
  variants:product_variants(id, sku, colour_name, material_label, price_adjustment, image_url, sort, is_active)
`

export const getFeedProducts = unstable_cache(
  async (): Promise<FeedProductRow[]> => {
    if (!SUPABASE_CONFIGURED) return []
    const [{ data, error }, tree] = await Promise.all([
      createPublicClient().from('products').select(FIELDS).eq('is_active', true).order('sort').order('slug'),
      getCategories(),
    ])
    if (error) throw new Error(`Feed: ${error.message}`)
    const byId = new Map(tree.map((c) => [c.id, c]))
    const pathOf = (id: string | null): string[] => {
      const path: string[] = []
      for (let c = id ? byId.get(id) : undefined; c && path.length < 6; c = c.parentId ? byId.get(c.parentId) : undefined) path.unshift(c.name)
      return path
    }
    return data.flatMap((p) => {
      const type = one(p.type)
      if (!type) return []
      const specs = (p.specifications ?? {}) as Record<string, unknown>
      return [
        {
          id: p.id,
          slug: p.slug,
          title: p.title,
          description: p.description,
          highlights: p.highlights,
          basePrice: Number(p.base_price),
          madeToOrder: p.made_to_order,
          madeInUk: p.origin === 'uk',
          material: typeof specs.material === 'string' ? specs.material : null,
          size: { width_cm: p.width_cm, depth_cm: p.depth_cm, height_cm: p.height_cm, side_a_cm: p.side_a_cm, side_b_cm: p.side_b_cm },
          gallery: p.gallery_images,
          axis1Value: p.axis1_value,
          typeName: type.name,
          googleCategory: type.google_product_category,
          metaCategory: type.meta_product_category,
          rangeName: one(p.range)?.name ?? null,
          categoryPath: pathOf(p.primary_category_id),
          offerTier: (one(p.tier)?.tier ?? null) as OfferTier | null,
          variants: [...p.variants]
            .filter((v) => v.is_active)
            .sort(bySort)
            .map((v) => ({
              id: v.id,
              sku: v.sku,
              colourName: v.colour_name,
              materialLabel: v.material_label,
              priceAdjustment: Number(v.price_adjustment),
              image: v.image_url,
            })),
        },
      ]
    })
  },
  ['feed-products-v1'],
  { revalidate: 900, tags: [CATALOGUE_TAG] },
)

/** Notes the fetch for the admin. Never throws: the feed is served either way. */
export async function recordFeedFetch(feed: FeedName, agent: FeedAgent, items: number): Promise<void> {
  if (!SUPABASE_SECRET_CONFIGURED) return
  try {
    const { error } = await createAdminClient().rpc('record_feed_fetch', { p_feed: feed, p_agent: agent, p_items: items })
    if (error) console.error('feed fetch record failed', error.message)
  } catch (e) {
    console.error('feed fetch record failed', e)
  }
}
