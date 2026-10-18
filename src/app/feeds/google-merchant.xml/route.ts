
// Google Merchant Center's feed, for free listings (switched on in Phase 20).
// FEATURES.googleFeed turns it off again (404). Delivery prices and times come
// from Merchant Center's own settings, by postcode (docs/MERCHANT-CENTER.md).

import { after } from 'next/server'
import { FEATURES } from '@/config/features'
import { SITE_URL } from '@/config/site'
import { buildFeed, feedAgent, googleFeedXml } from '@/lib/catalogue/feed'
import { getFeedProducts, recordFeedFetch } from '@/lib/catalogue/feed-load'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!FEATURES.googleFeed) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  let xml: string
  let count: number
  try {
    const { items } = buildFeed(await getFeedProducts(), SITE_URL)
    xml = googleFeedXml(items, SITE_URL)
    count = items.length
  } catch (e) {
    console.error('google feed failed', e)
    return new Response('The catalogue is unavailable just now.', { status: 503, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } })
  }
  const agent = feedAgent(request.headers.get('user-agent'))
  after(() => recordFeedFetch('google', agent, count))
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
