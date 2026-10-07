// Admin → Ad links: the catalogue feed's state (what's in it, what's left out,
// when Meta last fetched it) and the shop's ranges and products for links.

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/config/site'
import { buildFeed, type FeedAgent, type LeftOut } from '@/lib/catalogue/feed'
import { getFeedProducts } from '@/lib/catalogue/feed-load'

export interface FeedFetch {
  agent: FeedAgent
  last: string
  first: string
  count: number
  items: number
}

export interface AdLinkProduct {
  title: string
  slug: string
  colours: { sku: string; name: string | null }[]
}

export interface AdLinkRange {
  name: string
  slug: string | null
  products: AdLinkProduct[]
}

export async function loadAdLinks() {
  const db = await createClient()
  const [feedProducts, fetches, ranges, products] = await Promise.all([
    getFeedProducts(),
    db.from('feed_fetches').select('agent, first_fetched_at, last_fetched_at, fetch_count, last_items').eq('feed', 'meta'),
    db.from('ranges').select('id, name, slug, sort').eq('is_active', true).order('sort').order('name'),
    db
      .from('products')
      .select('title, slug, range_id, sort, variants:product_variants(sku, colour_name, sort, is_active)')
      .eq('is_active', true)
      .order('sort')
      .order('slug'),
  ])
  for (const r of [fetches, ranges, products]) if (r.error) throw new Error(`Ad links: ${r.error.message}`)

  const { items, leftOut } = buildFeed(feedProducts, SITE_URL)
  const toProduct = (p: NonNullable<typeof products.data>[number]): AdLinkProduct => ({
    title: p.title,
    slug: p.slug,
    colours: [...p.variants]
      .filter((v) => v.is_active)
      .sort((a, b) => a.sort - b.sort)
      .map((v) => ({ sku: v.sku, name: v.colour_name })),
  })
  const grouped: AdLinkRange[] = ranges.data!.map((r) => ({ name: r.name, slug: r.slug, products: products.data!.filter((p) => p.range_id === r.id).map(toProduct) }))
  const loose = products.data!.filter((p) => !p.range_id || !ranges.data!.some((r) => r.id === p.range_id)).map(toProduct)
  if (loose.length) grouped.push({ name: 'Not in a range', slug: null, products: loose })

  return {
    feedUrl: `${SITE_URL}/feeds/meta-catalogue.xml`,
    feed: { items: items.length, products: new Set(items.map((i) => i.itemGroupId ?? i.id)).size, leftOut: groupLeftOut(leftOut) },
    fetches: fetches.data!.map((f) => ({ agent: f.agent as FeedAgent, last: f.last_fetched_at, first: f.first_fetched_at, count: f.fetch_count, items: f.last_items })) satisfies FeedFetch[],
    ranges: grouped.filter((r) => r.products.length > 0),
  }
}

/** "Lily Footstool: Grey, Navy Blue (no photo of these colours)": one line per product and reason. */
function groupLeftOut(list: LeftOut[]) {
  const groups = new Map<string, { productTitle: string; slug: string; reason: LeftOut['reason']; colours: string[] }>()
  for (const l of list) {
    const key = `${l.slug}:${l.reason}`
    const g = groups.get(key) ?? { productTitle: l.productTitle, slug: l.slug, reason: l.reason, colours: [] }
    g.colours.push(l.colour ?? l.sku)
    groups.set(key, g)
  }
  return [...groups.values()]
}
