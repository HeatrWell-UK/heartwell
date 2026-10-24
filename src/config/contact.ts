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
  /** County, for search engines and "where are you?" answers. */
  county: string
  /** The postcode's centre (postcodes.io), for search engines' maps. */
  geo: { latitude: number; longitude: number }
}

export interface VisitDetails {
  /** "9am to 5pm". Days are added once the owner confirms them. */
  hours: string
  /** Opening days for search engines (schema.org day names), once confirmed. Empty leaves them out. */
  days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[]
  opens: string
  closes: string
  /** How much notice a visit needs, in days. */
  bookAheadDays: number
}

export const CONTACT = {
  email: SUPPORT_EMAIL,
  /** UK national format for display, e.g. "07700 900123". Phone and WhatsApp: the owner's new number, 24 October 2026. */
  phoneDisplay: '07460 669864' as string | null,
  /** E.164, e.g. "+447700900123". */
  phoneE164: '+447460669864' as string | null,
  /** International digits without "+", for wa.me links. */
  whatsAppNumber: '447460669864' as string | null,
  /** Owner, 12 October 2026; postcode confirmed 17 October 2026. */
  visitAddress: {
    street: 'Unit 4, Blacker Street',
    locality: 'Burnley',
    postcode: 'BB10 2AF',
    county: 'Lancashire',
    geo: { latitude: 53.809469, longitude: -2.240479 },
  } as VisitAddress | null,
  /** Showroom visits (owner, 17 October 2026): Monday to Friday, by appointment, booked at least a day ahead. Ordering online never closes; delivery days are in shop_settings (no Mondays). */
  visit: {
    hours: '9am to 5pm',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '17:00',
    bookAheadDays: 1,
  } as VisitDetails,
  trading: {
    companyName: null,
    companyNumber: null,
    registeredOffice: null,
    vatNumber: null,
  } as TradingDetails,
  /**
   * Owner, 17 October 2026: shown in the footer and given to search engines
   * (Organization sameAs). TikTok is left out until tiktok.com/@heartwellsofa
   * opens: on 17 October it said "Couldn't find this account".
   */
  socials: [
    { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/heartwellsofa' },
    { platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/heartwellsofa' },
  ] as SocialProfile[],
}

export interface SocialProfile {
  platform: 'facebook' | 'instagram' | 'tiktok'
  label: string
  url: string
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

/** "Monday to Saturday, 9am to 5pm", or just the hours until the days are confirmed. */
export function visitHoursText(v: VisitDetails = CONTACT.visit): string {
  if (v.days.length === 0) return v.hours
  if (v.days.length === 7) return `Every day, ${v.hours}`
  if (v.days.length === 1) return `${v.days[0]}s, ${v.hours}`
  return `${v.days[0]} to ${v.days.at(-1)}, ${v.hours}`
}

/** "By appointment only: book at least a day ahead." */
export function visitBookingText(v: VisitDetails = CONTACT.visit): string {
  return `By appointment only: book at least ${v.bookAheadDays === 1 ? 'a day' : `${v.bookAheadDays} days`} ahead.`
}
