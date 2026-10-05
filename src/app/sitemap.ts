import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'
import { CONTACT } from '@/config/contact'
import { getCategories, getListing, rangesFrom } from '@/lib/catalogue/listing'
import { categoryHref } from '@/lib/catalogue/tree'

// Rebuilt hourly. Lists every page a shopper can land on; filtered, sorted and
// search pages are left out (they point search engines at the plain pages).
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, listing] = await Promise.all([getCategories().catch(() => []), getListing().catch(() => [])])
  const url = (path: string) => `${SITE_URL}${path}`
  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    ...tree.map((c) => ({ url: url(categoryHref(tree, c)), changeFrequency: 'weekly' as const, priority: c.parentId ? 0.8 : 0.9 })),
    { url: url('/ranges'), changeFrequency: 'weekly', priority: 0.7 },
    ...rangesFrom(listing).map((r) => ({ url: url(`/ranges/${r.slug}`), changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...listing.map((p) => ({ url: url(`/products/${p.slug}`), changeFrequency: 'weekly' as const, priority: 0.8 })),
    { url: url('/fabrics'), changeFrequency: 'monthly', priority: 0.5 },
    ...(CONTACT.visitAddress ? [{ url: url('/visit-us'), changeFrequency: 'monthly' as const, priority: 0.5 }] : []),
  ]
}
