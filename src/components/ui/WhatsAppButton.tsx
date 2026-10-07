'use client'

// Every customer-facing WhatsApp link. The markup is a plain wa.me link (it
// works before the page's script has loaded); on tap it adds an HW-WA
// reference to the message, saves the enquiry in the background and opens
// WhatsApp the most reliable way for the browser the customer is in.

import { useRef, type ReactNode } from 'react'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { visitIds } from '@/lib/basket/store'
import { mintReference, platformOf, whatsAppLaunch, withReference } from '@/lib/whatsapp/handoff'

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
    if (enquiry) {
      // One reference per button and product choice; tapping twice reuses it.
      const key = [context, productId, variantId].join('|')
      if (!prepared.current || prepared.current.key !== key) prepared.current = { key, reference: mintReference(), sent: false }
      const { reference } = prepared.current
      text = withReference(message, reference)
      if (!prepared.current.sent) {
        prepared.current.sent = true
        saveEnquiry({ reference, context, productId, variantId, productName })
      }
    }

    const platform = platformOf(navigator.userAgent)
    const launch = whatsAppLaunch(number, text, platform)
    if (platform === 'other') {
      // Let the link do its normal job, with the reference in it.
      event.currentTarget.href = launch.url
      return
    }
    event.preventDefault()
    window.location.href = launch.url
    if (launch.fallback) {
      const fallback = launch.fallback
      // If WhatsApp opened, the page is hidden by now; if not, show WhatsApp's web page instead.
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') window.location.href = fallback
      }, 1600)
    }
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
      body: JSON.stringify({ ...e, page: window.location.pathname, visit: visitIds() }),
    }).catch(() => {})
  } catch {
    // Never let saving the enquiry get in the way of WhatsApp opening.
  }
}
