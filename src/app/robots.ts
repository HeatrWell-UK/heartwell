import type { MetadataRoute } from 'next'
import { SITE_INDEXABLE } from '@/config/env'
import { SITE_URL } from '@/config/site'

// Everything is kept out of search engines until go-live sets SITE_INDEXABLE.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/login', '/api/', '/confirm-order/', '/basket', '/saved', '/checkout', '/search', '/order/', '/review/', '/newsletter/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
