// The visitor's cookie choices, kept in one first-party cookie that both the
// browser and the server read (the server needs it to decide what a
// Conversions API event may carry).
//
//   marketing  - Meta Pixel and Meta's identifiers (_fbp, _fbc, fbclid), and
//                the IP address and browser sent with server events. Off until
//                the visitor accepts.
//   analytics  - Google Analytics cookies. Off until accepted (GA4 runs in
//                Consent Mode with cookieless pings until then).
//   statistics - our own first-party record of how a visitor found us (UTMs,
//                landing page), on by default under the UK statistics
//                exemption, with an easy way to switch it off.

export interface Consent {
  marketing: boolean
  analytics: boolean
  statistics: boolean
  /** Seconds since 1970 when the choice was made; null while no choice is stored. */
  at: number | null
}

/**
 * Bump when what a choice means changes (the categories, or what a button
 * switches on), so everyone is asked again. A new label for the same choice
 * doesn't need it: "Essential only" saves exactly what "Reject all" did.
 */
export const CONSENT_VERSION = 1
/** Asked again after six months. */
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60

export type ConsentChoice = Omit<Consent, 'at'>

/** "Accept all": Google Analytics, the Meta Pixel and our own statistics. */
export const ACCEPT_ALL: ConsentChoice = { marketing: true, analytics: true, statistics: true }

/**
 * "Essential only" (owner, 7 November 2026; it replaced "Reject all"): what
 * the shop needs, plus our own visit statistics, which UK law lets a shop keep
 * without asking as long as it's easy to switch them off (Cookie settings).
 * Google Analytics and the Meta Pixel stay off, and their cookies are deleted
 * from the device (see cookiesToClear).
 */
export const ESSENTIAL_ONLY: ConsentChoice = { marketing: false, analytics: false, statistics: true }

/** Until a choice is made, the shop behaves as if "Essential only" had been chosen. */
export const NO_CHOICE: Consent = { ...ESSENTIAL_ONLY, at: null }

/**
 * The Google and Meta cookies (set on our domain by their tags) that a choice
 * no longer allows, so switching them off also removes them from the device.
 */
export function cookiesToClear(c: ConsentChoice, names: string[]): string[] {
  return names.filter((n) => (!c.marketing && (n === '_fbp' || n === '_fbc')) || (!c.analytics && (n === '_ga' || n.startsWith('_ga_'))))
}

/**
 * The domains such a cookie may sit on: the host and each parent
 * ("www.heartwellsofa.co.uk" → itself, "heartwellsofa.co.uk", "co.uk"). Google
 * and Meta set theirs on the main domain; a browser ignores the ones it would
 * never allow.
 */
export function cookieDomains(hostname: string): string[] {
  const parts = hostname.split('.')
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join('.'))
}

/** "1.m1a0s1.1760000000" */
export function serialiseConsent(c: Omit<Consent, 'at'>, at = Math.floor(Date.now() / 1000)): string {
  return `${CONSENT_VERSION}.m${c.marketing ? 1 : 0}a${c.analytics ? 1 : 0}s${c.statistics ? 1 : 0}.${at}`
}

export function parseConsent(raw: string | null | undefined): Consent {
  const m = /^(\d+)\.m([01])a([01])s([01])\.(\d{9,11})$/.exec(raw?.trim() ?? '')
  if (!m || Number(m[1]) !== CONSENT_VERSION) return NO_CHOICE
  return { marketing: m[2] === '1', analytics: m[3] === '1', statistics: m[4] === '1', at: Number(m[5]) }
}

/**
 * A few bytes of script for <head>, run before anything paints: when a
 * current choice is stored it marks <html data-consent="set">, and CSS hides
 * the cookie banner the server drew for everyone. So the banner shows at
 * first paint for new visitors (rather than after the page's JavaScript) and
 * never flashes for people who have already answered.
 */
export function consentFlagScript(cookieName: string): string {
  const name = cookieName.replace(/[^a-z0-9-]/gi, '')
  return `try{if(/(?:^|;\\s*)${name}=${CONSENT_VERSION}\\.m[01]a[01]s[01]\\.\\d{9,11}(?:;|$)/.test(document.cookie))document.documentElement.dataset.consent='set'}catch(e){}`
}

/** What an order records: whether the customer had accepted marketing cookies. */
export const consentForOrder = (c: Consent): 'granted' | 'denied' | 'unknown' => (c.at === null ? 'unknown' : c.marketing ? 'granted' : 'denied')
