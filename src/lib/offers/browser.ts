// The offers in the browser: claiming the ad-visitor offer when a visit lands
// from an ad, starting the welcome offer on a first visit, and small stores
// the offer strips subscribe to. Client components only.

import { newEventId, readCookie } from '@/lib/tracking/browser'
import { visitIds } from '@/lib/basket/store'
import { classifyPaidLanding, OFFER_UNTIL_COOKIE } from './paid'
import { WELCOME_UNTIL_COOKIE } from './welcome'

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

// The welcome offer ------------------------------------------------------------

const WELCOME_CHANGED = 'hw:welcome'
/** This page has asked the shop and has its answer (none, when the cookie didn't come back). */
let welcomeAsked = false
let welcomeAsking: Promise<void> | null = null

export const welcomeStore = {
  subscribe(onChange: () => void) {
    window.addEventListener(WELCOME_CHANGED, onChange)
    return () => window.removeEventListener(WELCOME_CHANGED, onChange)
  },
  /**
   * The offer's end (ISO, possibly past) once the shop has said; 'none' when
   * it has no offer for this browser; '' while that isn't known yet.
   */
  getSnapshot(): string {
    return readCookie(WELCOME_UNTIL_COOKIE) || (welcomeAsked ? 'none' : '')
  },
  getServerSnapshot: () => '',
}

/**
 * On a visit without the welcome cookie, asks the shop for this visitor's
 * welcome offer (the database starts it on the first visit and never again).
 * Once per page; the cookie then answers every later page.
 */
export function claimWelcome(): Promise<void> {
  if (readCookie(WELCOME_UNTIL_COOKIE) || welcomeAsked) return Promise.resolve()
  welcomeAsking ??= (async () => {
    // Some in-app browsers block storage; the offer is then keyed to a one-off ID and this browser's cookie.
    const visit = visitIds()
    try {
      await fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visit?.visitorId ?? newEventId() }),
      })
    } catch {
      // No offer shown this time; nothing promised that checkout wouldn't honour.
    }
    welcomeAsked = true
    window.dispatchEvent(new Event(WELCOME_CHANGED))
  })()
  return welcomeAsking
}

function session(op: 'get' | 'set', value = ''): string | null {
  try {
    if (op === 'set') window.sessionStorage.setItem(CLAIMED, value)
    return window.sessionStorage.getItem(CLAIMED)
  } catch {
    return null
  }
}
