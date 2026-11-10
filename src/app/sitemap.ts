import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'
import { CONTACT } from '@/config/contact'
import { GUIDES } from '@/content/guides'
import { getCategories, getListing, rangesFrom } from '@/lib/catalogue/listing'
import { categoryHref, subtreeIds } from '@/lib/catalogue/tree'
import { getFeedProducts } from '@/lib/catalogue/feed-load'
import cloudinaryLoader from '@/lib/cloudinary-loader'
import { createPublicClient } from '@/lib/supabase/public'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

// Rebuilt hourly. Lists every page a shopper can land on; filtered, sorted and
// search pages are left out (they point search engines at the plain pages).
export const revalidate = 3600

/** Photos per product (every colourway, then the gallery) at a size the pages also use, for Google Images. */
const SITEMAP_IMAGE_WIDTH = 1200
const IMAGES_PER_PRODUCT = 12

/**
 * When a deploy last changed what every product page says (its words or
 * structured data). Product, range and category pages are dated by whichever
 * is later, this or the newest product change behind them, so Google
 * re-reads a page after a price change instead of showing the old price.
 * Move it on only for a change every product page shows.
 */
const PRODUCT_PAGES_REVISED = '2026-11-10T17:15:00Z'

/** When each product last changed (products.updated_at: prices, sizes, words). */
async function productDates(): Promise<Map<string, string>> {
  if (!SUPABASE_CONFIGURED) return new Map()
  const { data, error } = await createPublicClient().from('products').select('slug, updated_at')
  if (error) throw new Error(`Sitemap dates: ${error.message}`)
  return new Map(data.map((p) => [p.slug, p.updated_at]))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, listing, feed, dates] = await Promise.all([
    getCategories().catch(() => []),
    getListing().catch(() => []),
    getFeedProducts().catch(() => []),
    productDates().catch(() => new Map<string, string>()),
  ])
  const url = (path: string) => `${SITE_URL}${path}`
  // The newest of these products' changes (or the template's), as a lastmod.
  const changed = (slugs: string[]) => {
    const times = [PRODUCT_PAGES_REVISED, ...slugs.map((s) => dates.get(s))].flatMap((d) => (d ? [Date.parse(d)] : [])).filter(Number.isFinite)
    return dates.size && times.length ? { lastModified: new Date(Math.max(...times)) } : {}
  }
  const inCategory = (id: string) => {
    const ids = subtreeIds(tree, id)
    return listing.filter((p) => p.categoryIds.some((c) => ids.has(c))).map((p) => p.slug)
  }
  const all = listing.map((p) => p.slug)
  const photos = new Map(
    feed.map((p) => [
      p.slug,
      [...new Set([...p.variants.map((v) => v.image), ...p.gallery].filter((s): s is string => Boolean(s)))]
        .slice(0, IMAGES_PER_PRODUCT)
        .map((src) => cloudinaryLoader({ src, width: SITEMAP_IMAGE_WIDTH })),
    ]),
  )
  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1, ...changed(all) },
    ...tree.map((c) => ({ url: url(categoryHref(tree, c)), changeFrequency: 'weekly' as const, priority: c.parentId ? 0.8 : 0.9, ...changed(inCategory(c.id)) })),
    { url: url('/ranges'), changeFrequency: 'weekly', priority: 0.7, ...changed(all) },
    ...rangesFrom(listing).map((r) => ({
      url: url(`/ranges/${r.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      ...changed(listing.filter((p) => p.rangeSlug === r.slug).map((p) => p.slug)),
    })),
    ...listing.map((p) => ({
      url: url(`/products/${p.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...changed([p.slug]),
      ...(photos.get(p.slug)?.length ? { images: photos.get(p.slug) } : {}),
    })),
    { url: url('/fabrics'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/fabric-samples'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/reviews'), changeFrequency: 'weekly', priority: 0.5 },
    { url: url('/contact'), changeFrequency: 'yearly', priority: 0.4 },
    ...(CONTACT.visitAddress ? [{ url: url('/visit-us'), changeFrequency: 'monthly' as const, priority: 0.5 }] : []),
    { url: url('/about'), changeFrequency: 'yearly', priority: 0.4 },
    { url: url('/faq'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/delivery-and-returns'), changeFrequency: 'monthly', priority: 0.5 },
    { url: url('/will-it-fit'), changeFrequency: 'yearly', priority: 0.4 },
    { url: url('/care-guide'), changeFrequency: 'yearly', priority: 0.3 },
    { url: url('/guides'), changeFrequency: 'monthly', priority: 0.4 },
    ...GUIDES.map((g) => ({ url: url(`/guides/${g.slug}`), lastModified: g.updated, changeFrequency: 'yearly' as const, priority: 0.4 })),
    { url: url('/terms'), changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/cookies'), changeFrequency: 'yearly', priority: 0.2 },
  ]
}
