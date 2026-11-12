// Tracking in the browser: the visitor's cookie choices, staff and QA
// exclusions, how the visit began, and track() for funnel events. Only
// called from client components.
//
// track() makes one event ID and uses it for the Pixel, GA4 and the server
// copy (/api/track), so Meta counts the event once. It does nothing for staff
// devices or QA visits, and the Pixel and the server copy wait for consent.

import { CONSENT_COOKIE, isPrivatePath, STAFF_COOKIE } from '@/config/tracking'
import { storedVisitIds } from '@/lib/basket/store'
import { visitStepFor, type VisitStep } from '@/lib/attribution/visit'
import { CONSENT_MAX_AGE, cookieDomains, cookiesToClear, parseConsent, serialiseConsent, type Consent, type ConsentChoice } from './consent'
import { ga4Params, GA4_NAME, META_CUSTOM, pixelParams, type BrowserEventName, type EventData } from './events'

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    /** Which tags this page actually loaded. */
    __hwTracking?: { pixel: boolean; gtag: boolean }
  }
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

// Consent -------------------------------------------------------------------------

export const readConsent = (): Consent => parseConsent(readCookie(CONSENT_COOKIE))

export function visitIds() {
  return readConsent().marketing && !isStaffDevice() && !isQaVisit() ? storedVisitIds() : null
}

/** Deletes a cookie wherever it may have been set: host-only and on each parent domain. */
function deleteCookie(name: string) {
  for (const domain of ['', ...cookieDomains(window.location.hostname).map((d) => `; Domain=.${d}`)]) {
    document.cookie = `${name}=; Path=/; Max-Age=0${domain}`
  }
}

export function saveConsent(c: ConsentChoice) {
  writeCookie(CONSENT_COOKIE, serialiseConsent(c), CONSENT_MAX_AGE)
  // Switching Google or Meta off (Essential only, or later in Cookie settings) also removes their cookies.
  try {
    const names = document.cookie.split('; ').map((p) => p.slice(0, p.indexOf('=')))
    for (const name of cookiesToClear(c, names)) deleteCookie(name)
  } catch {
    // Never let tidying up stop the choice being saved.
  }
  if (!c.marketing) {
    try {
      window.localStorage.removeItem('hw-ad-visitor')
      window.localStorage.removeItem(TOUCH_KEY)
      for (const key of ['hw-session', 'hw-arrival', FBCLID_KEY, ARRIVAL_SENT]) window.sessionStorage.removeItem(key)
    } catch {
      // The server still checks consent before recording anything.
    }
  }
  window.dispatchEvent(new Event('hw:consent'))
}

/** For useSyncExternalStore: the raw cookie value, which changes only when the choice does. */
export const consentStore = {
  subscribe: (callback: () => void) => {
    window.addEventListener('hw:consent', callback)
    return () => window.removeEventListener('hw:consent', callback)
  },
  getSnapshot: () => readCookie(CONSENT_COOKIE) ?? '',
  getServerSnapshot: () => '',
}

export const openConsentSettings = () => window.dispatchEvent(new Event('hw:consent-open'))

// Staff devices and QA visits ------------------------------------------------------

export const isStaffDevice = () => readCookie(STAFF_COOKIE) === '1'

export function setStaffDevice(on: boolean) {
  writeCookie(STAFF_COOKIE, on ? '1' : '', on ? 400 * 24 * 60 * 60 : 0)
}

const QA_KEY = 'hw-qa'

/** ?qa=1 marks this visit (until the tab closes) as a test: no tracking, and orders are test orders. */
export function captureQa() {
  try {
    if (new URLSearchParams(window.location.search).get('qa') === '1') window.sessionStorage.setItem(QA_KEY, '1')
  } catch {
    // No storage: the flag is simply not kept.
  }
}

export function isQaVisit(): boolean {
  try {
    return window.sessionStorage.getItem(QA_KEY) === '1'
  } catch {
    return false
  }
}

// How the visit began ---------------------------------------------------------------

export interface Touch {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  landing?: string
  referrer?: string
  at: number
}

const TOUCH_KEY = 'hw-touch'
const FBCLID_KEY = 'hw-fbclid'
const ARRIVAL_SENT = 'hw-arrival-sent'

/**
 * The campaign tags in an address (utm_*), trimmed. When a tag appears twice
 * the last one counts: Meta appends an ad's URL parameters after a catalogue
 * link's own tags.
 */
export function tagsFrom(search: string): Omit<Touch, 'at' | 'landing' | 'referrer'> {
  const q = new URLSearchParams(search)
  const get = (k: string) =>
    q
      .getAll(k)
      .map((v) => v.trim())
      .filter(Boolean)
      .at(-1)
      ?.slice(0, 200) || undefined
  return { source: get('utm_source'), medium: get('utm_medium'), campaign: get('utm_campaign'), content: get('utm_content'), term: get('utm_term') }
}

const hasTags = (t: Partial<Touch>) => Boolean(t.source || t.medium || t.campaign || t.content || t.term)

function readTouches(): { first?: Touch; last?: Touch } {
  try {
    return JSON.parse(window.localStorage.getItem(TOUCH_KEY) ?? '{}') as { first?: Touch; last?: Touch }
  } catch {
    return {}
  }
}

/**
 * Notes how this visit began: the first page of a visit, or any page an ad
 * link leads to. Returns what to send to /api/attribution, or null when
 * nothing new happened.
 */
export function captureTouch(): { touch: Touch; fbclid?: string } | null {
  if (!readConsent().marketing) return null
  try {
    const url = new URL(window.location.href)
    const tags = tagsFrom(url.search)
    const fbclid = url.searchParams.get('fbclid')?.slice(0, 500) || undefined
    if (fbclid) window.sessionStorage.setItem(FBCLID_KEY, JSON.stringify({ fbclid, at: Date.now() }))
    const newVisit = window.sessionStorage.getItem(ARRIVAL_SENT) !== '1'
    if (!newVisit && !hasTags(tags) && !fbclid) return null
    let referrer: string | undefined
    try {
      const r = document.referrer ? new URL(document.referrer) : null
      referrer = r && r.host !== url.host ? r.host : undefined
    } catch {
      referrer = undefined
    }
    const touch: Touch = { ...tags, landing: url.pathname, referrer, at: Date.now() }
    const stored = readTouches()
    if (hasTags(tags) || !stored.last) {
      const next = { first: stored.first ?? touch, last: touch }
      window.localStorage.setItem(TOUCH_KEY, JSON.stringify(next))
    }
    window.sessionStorage.setItem(ARRIVAL_SENT, '1')
    return { touch, fbclid }
  } catch {
    return null
  }
}

/** The ad click ID from this visit, if any (sent only with marketing consent). */
export function sessionFbclid(): { fbclid: string; at: number } | null {
  if (!readConsent().marketing) return null
  try {
    return JSON.parse(window.sessionStorage.getItem(FBCLID_KEY) ?? 'null') as { fbclid: string; at: number } | null
  } catch {
    return null
  }
}

/** What an order records about how the customer found us: the latest campaign, or the first. */
export function touchForOrder(): Touch | null {
  if (!readConsent().marketing) return null
  const { first, last } = readTouches()
  return last && hasTags(last) ? last : (first ?? last ?? null)
}

// Events ---------------------------------------------------------------------------

/** A random UUID (version 4), the event ID Meta uses to match the browser and server copies. */
export function newEventId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Older in-app browsers: the same thing by hand.
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// Our own record of the visit ------------------------------------------------------

/**
 * Notes a step of this visit (a page, a basket add, starting checkout,
 * tapping Call) in our own statistics, so staff can match a phone or WhatsApp
 * order to it. Never for staff devices, QA visits or private pages, and not
 * without permission for advertising measurement.
 */
export function noteVisit(type: VisitStep, extra: { name?: string; value?: number } = {}) {
  if (typeof window === 'undefined' || isStaffDevice() || isQaVisit() || isPrivatePath(window.location.pathname)) return
  const visit = visitIds()
  if (!visit) return
  try {
    void fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ visit, type, path: window.location.pathname, ...extra }),
    }).catch(() => {})
  } catch {
    // Best effort, like the rest of our statistics.
  }
}

/** A funnel event: Pixel, GA4 and the server copy, one event ID. Returns the ID. */
export function track(name: BrowserEventName, data: EventData = {}): string {
  const eventId = newEventId()
  if (typeof window === 'undefined' || isStaffDevice() || isQaVisit() || isPrivatePath(window.location.pathname)) return eventId
  const step = visitStepFor(name, data)
  if (step) noteVisit(step.type, { name: step.name, value: step.value })
  const consent = readConsent()
  const loaded = window.__hwTracking
  try {
    if (loaded?.pixel && consent.marketing && window.fbq) window.fbq(META_CUSTOM.has(name) ? 'trackCustom' : 'track', name, pixelParams(data), { eventID: eventId })
    if (consent.analytics && loaded?.gtag && window.gtag) window.gtag('event', GA4_NAME[name], ga4Params(data))
  } catch {
    // A tag failing must never break the page.
  }
  if (consent.marketing) {
    try {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ name, eventId, path: window.location.pathname, visitorId: visitIds()?.visitorId ?? null, data }),
      }).catch(() => {})
    } catch {
      // Ignore: the browser copy (if any) still counts.
    }
  }
  return eventId
}
