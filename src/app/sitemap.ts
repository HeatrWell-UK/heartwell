import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'
import { CONTACT } from '@/config/contact'
import { GUIDES } from '@/content/guides'
import { getCategories, getListing, rangesFrom } from '@/lib/catalogue/listing'
import { categoryHref } from '@/lib/catalogue/tree'
import { getFeedProducts } from '@/lib/catalogue/feed-load'
import cloudinaryLoader from '@/lib/cloudinary-loader'

// Rebuilt hourly. Lists every page a shopper can land on; filtered, sorted and
// search pages are left out (they point search engines at the plain pages).
export const revalidate = 3600

/** Photos per product (every colourway, then the gallery) at a size the pages also use, for Google Images. */
const SITEMAP_IMAGE_WIDTH = 1200
const IMAGES_PER_PRODUCT = 12

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, listing, feed] = await Promise.all([getCategories().catch(() => []), getListing().catch(() => []), getFeedProducts().catch(() => [])])
  const url = (path: string) => `${SITE_URL}${path}`
  const photos = new Map(
    feed.map((p) => [
      p.slug,
      [...new Set([...p.variants.map((v) => v.image), ...p.gallery].filter((s): s is string => Boolean(s)))]
        .slice(0, IMAGES_PER_PRODUCT)
        .map((src) => cloudinaryLoader({ src, width: SITEMAP_IMAGE_WIDTH })),
    ]),
  )
  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    ...tree.map((c) => ({ url: url(categoryHref(tree, c)), changeFrequency: 'weekly' as const, priority: c.parentId ? 0.8 : 0.9 })),
    { url: url('/ranges'), changeFrequency: 'weekly', priority: 0.7 },
    ...rangesFrom(listing).map((r) => ({ url: url(`/ranges/${r.slug}`), changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...listing.map((p) => ({
      url: url(`/products/${p.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
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
