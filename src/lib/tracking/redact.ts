// What GA4 may see of an address: the path (or "/private" for pages whose
// address carries an order ID or a private link), the utm_ campaign tags and,
// on the search page, what was searched for (so GA4's site search report
// works) unless it looks like a postcode, email or phone number. Ad click IDs
// and anything else in the query string are dropped.

import { isPrivatePath } from '@/config/tracking'

const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\b/i
const EMAIL = /@/
const PHONE = /\d[\d\s-]{4,}\d/

/** A site search term GA4 may see, or null: short, and nothing that could identify someone. */
export function safeSearchTerm(raw: string | null): string | null {
  const term = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!term || term.length > 60 || POSTCODE.test(term) || EMAIL.test(term) || PHONE.test(term)) return null
  return term
}

export function redactedLocation(href: string): string {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return ''
  }
  const path = isPrivatePath(url.pathname) ? '/private' : url.pathname
  const kept = [...url.searchParams.entries()].filter(([k]) => /^utm_(source|medium|campaign|content|term)$/.test(k))
  const term = path === '/search' ? safeSearchTerm(url.searchParams.get('q')) : null
  if (term) kept.unshift(['q', term])
  const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : ''
  return `${url.origin}${path}${query}`
}
