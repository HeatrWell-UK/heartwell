// What GA4 may see of an address: the path (or "/private" for pages whose
// address carries an order ID or a private link) and only the utm_ campaign
// tags. Ad click IDs and anything else in the query string are dropped.

import { isPrivatePath } from '@/config/tracking'

export function redactedLocation(href: string): string {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return ''
  }
  const path = isPrivatePath(url.pathname) ? '/private' : url.pathname
  const kept = [...url.searchParams.entries()].filter(([k]) => /^utm_(source|medium|campaign|content|term)$/.test(k))
  const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : ''
  return `${url.origin}${path}${query}`
}
