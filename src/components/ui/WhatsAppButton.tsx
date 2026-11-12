'use client'

// Every customer-facing WhatsApp link. The markup is a plain wa.me link (it
// works before the page's script has loaded); on tap it adds an HW-WA
// reference to the message, saves the enquiry in the background and opens
// WhatsApp the most reliable way for the browser the customer is in. If
// WhatsApp doesn't open, the help sheet steps in (src/lib/whatsapp/help.ts).

import { useRef, type ReactNode } from 'react'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { mintReference, platformOf, whatsAppLaunch, withReference } from '@/lib/whatsapp/handoff'
import { watchHandoff } from '@/lib/whatsapp/help'
import { isQaVisit, track, visitIds } from '@/lib/tracking/browser'

/** The last reference, kept on the device for 30 days so a later order can be linked to the chat. */
const LAST_REFERENCE = 'hw-wa-ref'

export interface WhatsAppButtonProps {
  /** The message as the customer will see it, without the reference. */
  message: string
  /** Where the button is, e.g. "product", "home", "samples". */
  context: string
  productId?: string
  variantId?: string
  productName?: string
  /** False for help with an existing order: no new enquiry, no reference. */
  enquiry?: boolean
  className?: string
  children: ReactNode
}

export function WhatsAppButton({ message, context, productId, variantId, productName, enquiry = true, className, children }: WhatsAppButtonProps) {
  const prepared = useRef<{ key: string; reference: string; sent: boolean } | null>(null)
  const href = whatsAppHref(message)
  if (!href || !CONTACT.whatsAppNumber) return null
  const number = CONTACT.whatsAppNumber

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    let text = message
    let reference: string | null = null
    if (enquiry) {
      // One reference per button and product choice; tapping twice reuses it.
      const key = [context, productId, variantId].join('|')
      if (!prepared.current || prepared.current.key !== key) prepared.current = { key, reference: mintReference(), sent: false }
      reference = prepared.current.reference
      text = withReference(message, reference)
      if (!prepared.current.sent) {
        prepared.current.sent = true
        saveEnquiry({ reference, context, productId, variantId, productName })
        // Meta's "contacted the business" event, once per reference.
        track('Contact', { ...(variantId ? { contentIds: [variantId] } : {}), ...(productName ? { contentName: productName } : {}) })
      }
    }

    const platform = platformOf(navigator.userAgent)
    const launch = whatsAppLaunch(number, text, platform)
    // Did WhatsApp open? If the page is still on screen a moment later, the help sheet offers other ways in.
    watchHandoff({ web: launch.url, reference, productName, context, newTab: launch.newTab, platform })
    // The link does its normal job, as a real tap on a real link (what opens WhatsApp from the Facebook app), with the
    // reference in the message. In the apps' browsers it stays in the same page rather than a new tab.
    const link = event.currentTarget
    link.href = launch.url
    if (launch.newTab) link.target = '_blank'
    else link.removeAttribute('target')
  }

  return (
    <a href={href} onClick={onClick} target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  )
}

/** WhatsApp when the shop has a number, otherwise an email with the same question. */
export function WhatsAppOrEmail({ emailSubject, emailBody, ...props }: WhatsAppButtonProps & { emailSubject: string; emailBody?: string }) {
  if (CONTACT.whatsAppNumber) return <WhatsAppButton {...props} />
  const query = `subject=${encodeURIComponent(emailSubject)}${emailBody ? `&body=${encodeURIComponent(emailBody)}` : ''}`
  return (
    <a href={`mailto:${CONTACT.email}?${query}`} className={props.className}>
      {props.children}
    </a>
  )
}

function saveEnquiry(e: { reference: string; context: string; productId?: string; variantId?: string; productName?: string }) {
  try {
    window.localStorage.setItem(LAST_REFERENCE, JSON.stringify({ reference: e.reference, at: Date.now() }))
  } catch {
    // Private browsing: nothing to keep.
  }
  try {
    void fetch('/api/whatsapp-enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      // The path only: ad click IDs in the address wait for the cookie choice (Phase 14).
      body: JSON.stringify({ ...e, page: window.location.pathname, visit: visitIds(), qa: isQaVisit() }),
    }).catch(() => {})
  } catch {
    // Never let saving the enquiry get in the way of WhatsApp opening.
  }
}
