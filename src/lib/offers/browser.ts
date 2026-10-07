// The ad-visitor offer in the browser: claiming it when a visit lands from an
// ad, and a small store the offer strips subscribe to. Client components only.

import { newEventId, readCookie } from '@/lib/tracking/browser'
import { visitIds } from '@/lib/basket/store'
import { classifyPaidLanding, OFFER_UNTIL_COOKIE } from './paid'

const CHANGED = 'hw:offer'
const CLAIMED = 'hw-offer-claimed'

export const offerStore = {
  subscribe(onChange: () => void) {
    window.addEventListener(CHANGED, onChange)
    return () => window.removeEventListener(CHANGED, onChange)
  },
  /** The end date (ISO) while an offer is live; '' otherwise. A string, so React can compare snapshots. */
  getSnapshot(): string {
    const raw = readCookie(OFFER_UNTIL_COOKIE)
    return raw && new Date(raw).getTime() > Date.now() ? raw : ''
  },
  getServerSnapshot: () => '',
}

export const offerChanged = () => window.dispatchEvent(new Event(CHANGED))

/**
 * When this address came from an ad, asks the server for the offer (once per
 * ad address per visit). The server decides again; the page only asks.
 */
export async function claimOfferFromAd(): Promise<void> {
  const search = window.location.search
  if (!classifyPaidLanding(search) || session('get') === search) return
  // Some in-app browsers block storage; the offer still works, keyed to a one-off ID.
  const visit = visitIds()
  try {
    const res = await fetch('/api/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: visit?.visitorId ?? newEventId(), arrivalId: visit?.arrivalId, search }),
    })
    if (!res.ok) return
    session('set', search)
    offerChanged()
  } catch {
    // No offer this time; the code still works at checkout.
  }
}

function session(op: 'get' | 'set', value = ''): string | null {
  try {
    if (op === 'set') window.sessionStorage.setItem(CLAIMED, value)
    return window.sessionStorage.getItem(CLAIMED)
  } catch {
    return null
  }
}
