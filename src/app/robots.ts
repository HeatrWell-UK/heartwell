import type { MetadataRoute } from 'next'
import { SITE_INDEXABLE } from '@/config/env'
import { SITE_URL } from '@/config/site'

// Everything is kept out of search engines until go-live sets SITE_INDEXABLE.
//
// /*_rsc (27 October 2026): Next.js preloads every link on a page as a
// "?_rsc=" data request. Googlebot's renderer made those in bursts, Hostinger
// answered 42% of them with server errors, and Google slowed its crawl of the
// whole site (Search Console → Crawl stats). They're never needed to read a
// page (its HTML has everything), so crawlers skip them.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/login', '/api/', '/confirm-order/', '/basket', '/saved', '/checkout', '/search', '/order/', '/review/', '/newsletter/', '/*_rsc'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
