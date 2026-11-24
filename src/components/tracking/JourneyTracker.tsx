'use client'

// Journey events that the whole shop shares (Run 3): page views (first load,
// in-app page change or back/forward), scroll milestones, taps on marked
// buttons (data-journey-cta="position"), WhatsApp and phone taps, form fields
// on marked forms (data-journey-form: which kind of field was used and which
// failed, never what was typed) and the page's exit with its last step. One
// listener of each kind for the whole page. Nothing here without analytics
// consent (journey() checks it).

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { journey, lastJourneyEvent, startPage, toCode } from '@/lib/journey/browser'
import { errorCodeFor, fieldCategoryFor, SCROLL_MILESTONES } from '@/lib/journey/taxonomy'

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const isField = (t: EventTarget | null): t is Field => t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement

function inJourneyForm(el: Element): string | null {
  return el.closest<HTMLElement>('[data-journey-form]')?.dataset.journeyForm ?? null
}

export function JourneyTracker() {
  const pathname = usePathname()
  const first = useRef(true)
  const scroll = useRef({ max: 0, sent: new Set<number>() })
  const exited = useRef(false)

  // Page views, with how the page was reached.
  useEffect(() => {
    startPage()
    scroll.current = { max: 0, sent: new Set() }
    exited.current = false
    let navigation: 'load' | 'spa' | 'back_forward' | 'reload' = 'spa'
    if (first.current) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      navigation = nav?.type === 'reload' ? 'reload' : nav?.type === 'back_forward' ? 'back_forward' : 'load'
      first.current = false
    }
    journey('page_view', { navigation })
  }, [pathname])

  // Scroll milestones, once each per page view.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const doc = document.documentElement
        const total = doc.scrollHeight - window.innerHeight
        const pct = total <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / total) * 100))
        const s = scroll.current
        s.max = Math.max(s.max, pct)
        for (const m of SCROLL_MILESTONES) {
          if (pct >= m && !s.sent.has(m)) {
            s.sent.add(m)
            journey('scroll_depth', { scrollPercent: m })
          }
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Taps: marked buttons, WhatsApp, phone, back to basket.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : null
      if (!el) return
      const cta = el.closest<HTMLElement>('[data-journey-cta]')
      const link = el.closest<HTMLAnchorElement>('a[href]')
      const href = link?.getAttribute('href') ?? ''
      if (el.closest('[data-floating-whatsapp]') || /wa\.me|whatsapp\.com/.test(href) || el.closest('[data-whatsapp]')) {
        journey('whatsapp_click', { ctaPosition: cta?.dataset.journeyCta ?? (el.closest('[data-floating-whatsapp]') ? 'floating' : 'inline') })
        return
      }
      if (href.startsWith('tel:')) {
        journey('phone_click', { ctaPosition: cta?.dataset.journeyCta ?? 'inline' })
        return
      }
      if (href === '/basket' && window.location.pathname.startsWith('/checkout')) {
        journey('back_to_basket', { ctaPosition: cta?.dataset.journeyCta ?? 'link' })
        return
      }
      if (cta) journey('cta_click', { ctaPosition: toCode(cta.dataset.journeyCta ?? 'cta'), ...(href.startsWith('/') ? { destination: toCode(href.split('/')[1] || 'home') } : {}) })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  // Form fields on marked forms: the kind of field, completed or not, and why it failed.
  useEffect(() => {
    const focused = new WeakSet<Element>()
    const onFocus = (e: FocusEvent) => {
      const t = e.target
      if (!isField(t) || focused.has(t)) return
      const form = inJourneyForm(t)
      if (!form) return
      focused.add(t)
      journey('field_focus', { fieldCategory: fieldCategoryFor(t.name, t.autocomplete), section: toCode(form) })
    }
    const onBlur = (e: FocusEvent) => {
      const t = e.target
      if (!isField(t)) return
      const form = inJourneyForm(t)
      if (!form) return
      const filled = t instanceof HTMLInputElement && (t.type === 'checkbox' || t.type === 'radio') ? t.checked : t.value.trim() !== ''
      if (filled && t.checkValidity()) journey('field_complete', { fieldCategory: fieldCategoryFor(t.name, t.autocomplete), section: toCode(form) })
    }
    const onInvalid = (e: Event) => {
      const t = e.target
      if (!isField(t)) return
      const form = inJourneyForm(t)
      if (!form) return
      journey('validation_error', { fieldCategory: fieldCategoryFor(t.name, t.autocomplete), errorCode: errorCodeFor(t.validity), section: toCode(form) })
    }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    document.addEventListener('invalid', onInvalid, true)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
      document.removeEventListener('invalid', onInvalid, true)
    }
  }, [])

  // The page's exit (tab closed, app switched away for good, another site): once per page view, with the last step.
  useEffect(() => {
    const onHide = (e: PageTransitionEvent) => {
      if (exited.current || e.persisted) return
      exited.current = true
      const last = lastJourneyEvent()
      journey('page_exit', { scrollPercent: scroll.current.max, ...(last ? { lastEvent: last } : {}) }, { beacon: true })
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  return null
}
