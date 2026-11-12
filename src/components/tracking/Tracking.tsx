'use client'

// The shop's tags, loaded only when they're allowed:
// - Meta Pixel: on the live domain, in test or live mode, after the visitor
//   accepts marketing cookies, never on private pages or staff devices.
// - GA4: on the live domain after analytics consent.
// It also records advertising attribution after consent and shows the cookie
// question until it's answered.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { APP_ENV } from '@/config/env'
import { isPrivatePath, liveAllowed, TRACKING, type TrackingMode } from '@/config/tracking'
import { parseConsent } from '@/lib/tracking/consent'
import { captureQa, captureTouch, consentStore, isQaVisit, isStaffDevice, noteVisit, visitIds } from '@/lib/tracking/browser'
import { redactedLocation } from '@/lib/tracking/redact'
import { ConsentBanner, ConsentSettings } from './ConsentBanner'

function loadPixel(pixelId: string, externalId: string | null) {
  if (window.fbq) return
  // Meta's standard loader, written out so no inline script is needed.
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue!.push(args)
  }) as NonNullable<Window['fbq']>
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  window.fbq = fbq
  window._fbq = fbq
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  // Our visitor ID matches the server copy's external_id (the Pixel hashes it).
  fbq('init', pixelId, externalId ? { external_id: externalId } : {})
}

function loadGtag(measurementId: string) {
  if (window.gtag) return
  window.dataLayer = window.dataLayer ?? []
  // gtag must queue the arguments object itself.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 })
  window.gtag('set', 'ads_data_redaction', true)
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)
}

function postAttribution(body: object) {
  try {
    void fetch('/api/attribution', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify(body) }).catch(() => {})
  } catch {
    // First-party statistics are best effort.
  }
}

export function Tracking({ mode }: { mode: TrackingMode }) {
  const raw = useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot, consentStore.getServerSnapshot)
  const consent = parseConsent(raw || null)
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const open = () => setSettingsOpen(true)
    window.addEventListener('hw:consent-open', open)
    return () => window.removeEventListener('hw:consent-open', open)
  }, [])

  // Record arrivals and browsing only after permission for advertising measurement.
  useEffect(() => {
    captureQa()
    if (isStaffDevice() || isQaVisit() || !consent.marketing || isPrivatePath(pathname)) return
    const visit = visitIds()
    const arrival = captureTouch()
    if (visit && arrival) {
      const { touch, fbclid } = arrival
      postAttribution({ visit, touch: { ...touch, at: undefined }, ...(fbclid ? { fbclid } : {}) })
    }
    noteVisit('page_view')
  }, [pathname, consent.marketing])

  // Load the tags that are allowed, and keep Google's consent state in step.
  useEffect(() => {
    const state = (window.__hwTracking ??= { pixel: false, gtag: false })
    const allowed = liveAllowed(window.location.hostname, APP_ENV) && mode !== 'dry_run' && !isStaffDevice() && !isQaVisit() && !isPrivatePath(pathname)
    if (allowed && TRACKING.ga4Id && consent.analytics) {
      loadGtag(TRACKING.ga4Id)
      state.gtag = true
    }
    if (TRACKING.ga4Id) Object.assign(window, { ['ga-disable-' + TRACKING.ga4Id]: !allowed || !consent.analytics })
    if (window.gtag && allowed && consent.analytics) {
      const g = (on: boolean) => (on ? 'granted' : 'denied')
      window.gtag('consent', 'update', { analytics_storage: g(consent.analytics), ad_storage: g(consent.marketing), ad_user_data: g(consent.marketing), ad_personalization: g(consent.marketing) })
    }
    if (allowed && TRACKING.metaPixelId && consent.marketing) {
      loadPixel(TRACKING.metaPixelId, visitIds()?.visitorId ?? null)
      window.fbq?.('consent', 'grant')
      state.pixel = true
    } else if (window.fbq && !consent.marketing) {
      window.fbq('consent', 'revoke')
    }
  }, [mode, pathname, consent.marketing, consent.analytics])

  useEffect(() => {
    if (!isPrivatePath(pathname) && consent.marketing && window.__hwTracking?.pixel) window.fbq?.('track', 'PageView')
  }, [pathname, consent.marketing])

  useEffect(() => {
    if (isPrivatePath(pathname) || !consent.analytics || !window.__hwTracking?.gtag) return
    window.gtag?.('event', 'page_view', { page_location: redactedLocation(window.location.href), page_title: document.title })
  }, [pathname, consent.analytics])

  const askable = APP_ENV !== 'production' || Boolean(TRACKING.metaPixelId || TRACKING.ga4Id)
  // The server draws the banner for everyone, so it's there at first paint; a
  // stored choice hides it before then (consentFlagScript) and removes it here.
  return (
    <>
      {askable && consent.at === null && !isPrivatePath(pathname) && !settingsOpen && <ConsentBanner onChoose={() => setSettingsOpen(true)} />}
      {/* Remounted each time it opens, so it starts from the saved choice. */}
      <ConsentSettings key={settingsOpen ? 'open' : 'closed'} open={settingsOpen} onClose={() => setSettingsOpen(false)} current={consent} />
    </>
  )
}
