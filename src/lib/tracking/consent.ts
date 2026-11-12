export interface Consent {
  marketing: boolean
  analytics: boolean
  /** Unix time in seconds when the choice was saved. */
  at: number | null
}

// Version 1 treated visit tracking as essential. Ask for a fresh choice.
export const CONSENT_VERSION = 2
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60
export type ConsentChoice = Omit<Consent, 'at'>

export const ACCEPT_ALL: ConsentChoice = { marketing: true, analytics: true }
export const ESSENTIAL_ONLY: ConsentChoice = { marketing: false, analytics: false }
export const NO_CHOICE: Consent = { ...ESSENTIAL_ONLY, at: null }

export function cookiesToClear(c: ConsentChoice, names: string[]): string[] {
  return names.filter((n) => (!c.marketing && (n === '_fbp' || n === '_fbc')) || (!c.analytics && (n === '_ga' || n.startsWith('_ga_'))))
}

/** Cookies may be on the host or on a parent domain. */
export function cookieDomains(hostname: string): string[] {
  const parts = hostname.split('.')
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join('.'))
}

export function serialiseConsent(c: ConsentChoice, at = Math.floor(Date.now() / 1000)): string {
  return `${CONSENT_VERSION}.m${c.marketing ? 1 : 0}a${c.analytics ? 1 : 0}.${at}`
}

export function parseConsent(raw: string | null | undefined): Consent {
  const m = /^(\d+)\.m([01])a([01])\.(\d{9,11})$/.exec(raw?.trim() ?? '')
  if (!m || Number(m[1]) !== CONSENT_VERSION) return NO_CHOICE
  return { marketing: m[2] === '1', analytics: m[3] === '1', at: Number(m[4]) }
}

/** Hide the server-rendered banner before paint when a current choice is saved. */
export function consentFlagScript(cookieName: string): string {
  const name = cookieName.replace(/[^a-z0-9-]/gi, '')
  return `try{if(/(?:^|;\\s*)${name}=${CONSENT_VERSION}\\.m[01]a[01]\\.\\d{9,11}(?:;|$)/.test(document.cookie))document.documentElement.dataset.consent='set'}catch(e){}`
}

export const consentForOrder = (c: Consent): 'granted' | 'denied' | 'unknown' => (c.at === null ? 'unknown' : c.marketing ? 'granted' : 'denied')
