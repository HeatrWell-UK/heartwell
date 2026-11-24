'use client'

// Sends journey events (Run 3) to /api/journey: codes only, with the visitor's
// analytics consent, never for staff devices, QA visits or private pages. Each
// page view gets a sequence and a clock, so the report can order steps and
// tell a real exit from a page change. Best effort: never breaks the page.

import { isPrivatePath } from '@/config/tracking'
import { isQaVisit, isStaffDevice, newEventId, readConsent, visitIds } from '@/lib/tracking/browser'
import { pageTypeFor, type FieldCategory, type JourneyEvent, type Outcome } from './taxonomy'

const SESSION_KEY = 'hw-journey-session'

export interface JourneyFields {
  step?: string
  outcome?: Outcome
  errorCode?: string
  fieldCategory?: FieldCategory
  ctaPosition?: string
  section?: string
  optionCode?: string
  destination?: string
  lastEvent?: JourneyEvent
  navigation?: 'load' | 'spa' | 'back_forward' | 'reload'
  scrollPercent?: number
  quantity?: number
  variantId?: string
}

const page = { started: 0, sequence: 0, last: null as JourneyEvent | null }

/** A new page view: resets the sequence and the clock. */
export function startPage() {
  page.started = Date.now()
  page.sequence = 0
  page.last = null
}

export const lastJourneyEvent = () => page.last

function sessionId(): string | null {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY)
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = newEventId()
      window.sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

function deviceClass(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

/** A code-safe version of a label ("Add to basket" → "add_to_basket"). */
export const toCode = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'other'

export function journey(event: JourneyEvent, fields: JourneyFields = {}, opts: { beacon?: boolean } = {}) {
  if (typeof window === 'undefined') return
  try {
    const path = window.location.pathname
    if (isStaffDevice() || isQaVisit() || isPrivatePath(path) || !readConsent().analytics) return
    const session = sessionId()
    if (!session) return
    const ad = visitIds()
    page.sequence += 1
    const body = JSON.stringify({
      eventId: newEventId(),
      sessionId: session,
      ...(ad ? { visitorId: ad.visitorId, arrivalId: ad.arrivalId } : {}),
      event,
      path,
      pageType: pageTypeFor(path),
      deviceClass: deviceClass(),
      sequence: page.sequence,
      elapsedMs: page.started ? Math.min(Date.now() - page.started, 86_400_000) : 0,
      ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== '')),
    })
    if (event !== 'page_exit') page.last = event
    if (opts.beacon && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/journey', new Blob([body], { type: 'application/json' }))
      return
    }
    void fetch('/api/journey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body }).catch(() => {})
  } catch {
    // Statistics never break the page.
  }
}
