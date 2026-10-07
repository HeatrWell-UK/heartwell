// Meta's catalogue feed: https://heartwellfurniture.co.uk/feeds/meta-catalogue.xml
// Commerce Manager fetches it on a schedule (hourly). Built from the cached
// catalogue on every request rather than cached whole, so each fetch is
// noted for the admin ("Meta last fetched it at …").

import { after } from 'next/server'
import { SITE_URL } from '@/config/site'
import { buildFeed, feedAgent, metaFeedXml } from '@/lib/catalogue/feed'
import { getFeedProducts, recordFeedFetch } from '@/lib/catalogue/feed-load'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  let xml: string
  let count: number
  try {
    const { items } = buildFeed(await getFeedProducts(), SITE_URL)
    xml = metaFeedXml(items, SITE_URL)
    count = items.length
  } catch (e) {
    // Meta keeps the items it has when a fetch fails, and shows the failure in Commerce Manager.
    console.error('meta feed failed', e)
    return new Response('The catalogue is unavailable just now.', { status: 503, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } })
  }
  const agent = feedAgent(request.headers.get('user-agent'))
  after(() => recordFeedFetch('meta', agent, count))
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
