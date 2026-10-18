// IndexNow (indexnow.org): tells Bing, Yandex, Seznam and Naver the moment a
// page changes, instead of waiting for their next crawl. Bing's index also
// feeds ChatGPT search and Copilot. The key is public by design: search
// engines check it against public/<key>.txt on this domain.
//
// Only the live shop pings, so the pre-launch site and local builds never
// announce addresses that aren't the real ones.

import { APP_ENV, SITE_INDEXABLE } from '@/config/env'
import { LIVE_DOMAIN, SITE_URL } from '@/config/site'

export const INDEXNOW_KEY = '3d55e0a0a44569590386357208be9804'
const ENDPOINT = 'https://api.indexnow.org/indexnow'
/** IndexNow's limit for one submission. */
const MAX_URLS = 10000

/** Whether this deployment may announce pages (the live domain, in production, open to search engines). */
export function indexNowAllowed(siteUrl = SITE_URL, appEnv = APP_ENV, indexable = SITE_INDEXABLE): boolean {
  return appEnv === 'production' && indexable && new URL(siteUrl).host === LIVE_DOMAIN
}

/** The request body for a list of paths ("/products/x") or full addresses on this site. */
export function indexNowBody(paths: string[], siteUrl = SITE_URL) {
  const host = new URL(siteUrl).host
  const urlList = [...new Set(paths.map((p) => new URL(p, siteUrl).href))].filter((u) => new URL(u).host === host).slice(0, MAX_URLS)
  return { host, key: INDEXNOW_KEY, keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`, urlList }
}

/**
 * Announces changed pages. Never throws and never holds up the caller: run it
 * in after(). A product that was hidden or deleted is announced too, so its
 * 404 is picked up quickly.
 */
export async function submitToIndexNow(paths: string[]): Promise<void> {
  if (!indexNowAllowed() || paths.length === 0) return
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(indexNowBody(paths)),
      signal: AbortSignal.timeout(10_000),
    })
    // 200 and 202 both mean accepted.
    if (!res.ok) console.error('IndexNow refused', res.status, (await res.text()).slice(0, 200))
  } catch (e) {
    console.error('IndexNow failed', e)
  }
}
