// Heartwell's contact and trading details, in one place.
//
// Anything the owner has not supplied yet is null, and every component hides a
// null value rather than printing a placeholder, so nothing half-finished can
// reach a customer. Fill these in as the details arrive (plan section 9).

import { SUPPORT_EMAIL } from './site'

export interface TradingDetails {
  /** Registered company name when Heartwell is a trading name, e.g. "Example Ltd". */
  companyName: string | null
  companyNumber: string | null
  registeredOffice: string | null
  vatNumber: string | null
}

export interface VisitAddress {
  street: string
  locality: string
  postcode: string
}

export const CONTACT = {
  email: SUPPORT_EMAIL,
  /** UK national format for display, e.g. "07700 900123". */
  phoneDisplay: '07848 477056' as string | null,
  /** E.164, e.g. "+447700900123". */
  phoneE164: '+447848477056' as string | null,
  /** International digits without "+", for wa.me links. */
  whatsAppNumber: '447848477056' as string | null,
  visitAddress: null as VisitAddress | null,
  openingHours: null as string | null,
  trading: {
    companyName: null,
    companyNumber: null,
    registeredOffice: null,
    vatNumber: null,
  } as TradingDetails,
  socials: [] as { platform: 'facebook' | 'instagram' | 'tiktok'; url: string }[],
}

/** wa.me link, optionally with a pre-filled message. Null until a number is set. */
export function whatsAppHref(message?: string): string | null {
  if (!CONTACT.whatsAppNumber) return null
  const base = `https://wa.me/${CONTACT.whatsAppNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** tel: link. Null until a number is set. */
export function phoneHref(): string | null {
  return CONTACT.phoneE164 ? `tel:${CONTACT.phoneE164}` : null
}
