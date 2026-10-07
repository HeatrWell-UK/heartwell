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

/** Bump when the banner's wording or the categories change, so everyone is asked again. */
export const CONSENT_VERSION = 1
/** Asked again after six months. */
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60

export const NO_CHOICE: Consent = { marketing: false, analytics: false, statistics: true, at: null }

/** "1.m1a0s1.1760000000" */
export function serialiseConsent(c: Omit<Consent, 'at'>, at = Math.floor(Date.now() / 1000)): string {
  return `${CONSENT_VERSION}.m${c.marketing ? 1 : 0}a${c.analytics ? 1 : 0}s${c.statistics ? 1 : 0}.${at}`
}

export function parseConsent(raw: string | null | undefined): Consent {
  const m = /^(\d+)\.m([01])a([01])s([01])\.(\d{9,11})$/.exec(raw?.trim() ?? '')
  if (!m || Number(m[1]) !== CONSENT_VERSION) return NO_CHOICE
  return { marketing: m[2] === '1', analytics: m[3] === '1', statistics: m[4] === '1', at: Number(m[5]) }
}

/** What an order records: whether the customer had accepted marketing cookies. */
export const consentForOrder = (c: Consent): 'granted' | 'denied' | 'unknown' => (c.at === null ? 'unknown' : c.marketing ? 'granted' : 'denied')
