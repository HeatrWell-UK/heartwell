import 'server-only'
import { getListing } from '@/lib/catalogue/listing'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { createPublicClient } from '@/lib/supabase/public'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

/** Pieces the shop keeps out of every offer (offer_product_tiers EXCLUDED: the Sims Footstool). Anyone may read the tiers. */
export async function excludedSlugs(): Promise<Set<string>> {
  if (!SUPABASE_CONFIGURED) return new Set()
  const { data } = await createPublicClient().from('offer_product_tiers').select('tier, product:products!inner(slug)').eq('tier', 'EXCLUDED')
  return new Set((data ?? []).map((r) => (Array.isArray(r.product) ? r.product[0]?.slug : (r.product as { slug?: string } | null)?.slug)).filter((s): s is string => Boolean(s)))
}

/**
 * Every piece the season's £50 covers (Run 3: all sofas and chairs, made to
 * order or imported), at today's real price, cheapest first. The same rule as
 * the database's calculate_order_offer: anything not tier EXCLUDED.
 */
export async function getSeasonProducts(): Promise<ListingProduct[]> {
  const [listing, excluded] = await Promise.all([getListing(), excludedSlugs()])
  return listing.filter((p) => !excluded.has(p.slug)).sort((a, b) => a.price - b.price)
}
