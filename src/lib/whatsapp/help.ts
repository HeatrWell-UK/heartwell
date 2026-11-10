'use client'

// What happens after a WhatsApp tap (10 November 2026). Taps were being saved
// (22 in three days, nearly all from the Facebook and Instagram apps) but no
// messages arrived, so the hand-off itself is watched now:
// - the page hiding soon after the tap means WhatsApp (or a new tab) opened:
//   noted as `whatsapp_opened`, straight away, while the page can still send;
// - the page still on screen a moment later means it didn't: noted as
//   `whatsapp_stuck`, and the help sheet (WhatsAppHelp) offers another way in:
//   open WhatsApp again, copy our number, call, or leave a number for us to
//   message.
// The notes are our own statistics (the visit's steps, /api/visit), with the
// HW-WA reference and the kind of browser; nothing personal, nothing to Meta.

import { noteVisit } from '@/lib/tracking/browser'
import { handoffNote, type Platform } from './handoff'

export const HELP_EVENT = 'hw:whatsapp-help'

export interface WhatsAppHelpRequest {
  /** "stuck": WhatsApp didn't open. "callback": the customer asked us to message them. */
  mode: 'stuck' | 'callback'
  /** The plain wa.me link with the message, for trying again. */
  web: string | null
  reference: string | null
  productName?: string
  context: string
  /** Open the wa.me link in a new tab (ordinary browsers), or in place (the apps' browsers). */
  newTab: boolean
}

/** Opens the help sheet (WhatsAppHelp, in the shop's frame). */
export function openWhatsAppHelp(request: WhatsAppHelpRequest) {
  window.dispatchEvent(new CustomEvent<WhatsAppHelpRequest>(HELP_EVENT, { detail: request }))
}

/** Long enough for a phone to switch apps, short enough that nobody gives up first. */
export const HANDOFF_WAIT_MS = 2500

/**
 * Watches one hand-off. `retry` is a second try from the help sheet: noted,
 * but it never opens the sheet again.
 */
export function watchHandoff(request: Omit<WhatsAppHelpRequest, 'mode'> & { platform: Platform; retry?: boolean }) {
  const note = handoffNote(request.reference, request.platform, request.retry)
  let left = false
  const leave = () => {
    if (left) return
    left = true
    noteVisit('whatsapp_opened', { name: note })
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') leave()
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', leave)
  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', leave)
    if (left || document.visibilityState === 'hidden') return leave()
    noteVisit('whatsapp_stuck', { name: note })
    if (!request.retry) {
      openWhatsAppHelp({ mode: 'stuck', web: request.web, reference: request.reference, productName: request.productName, context: request.context, newTab: request.newTab })
    }
  }, HANDOFF_WAIT_MS)
}
