// WhatsApp from the shop: the HW-WA reference that ties a chat back to the
// page and product it started from, and the link that opens WhatsApp most
// reliably from where the customer is.
//
// The reference is made in the browser at the moment of the tap, so WhatsApp
// opens straight away; the enquiry is saved in the background with the same
// reference (the database accepts it in the same format it makes itself).
//
// Opening WhatsApp: a normal https://wa.me link works in Safari and Chrome,
// but the Instagram and Facebook in-app browsers often show WhatsApp's web
// page instead of opening the app. There the app's own link is used:
// whatsapp:// on iPhone (with wa.me as a fallback if the app isn't
// installed) and an Android intent with wa.me as its built-in fallback.

/** The database's alphabet for codes: no 0/O or 1/I to misread. */
export const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const WA_REFERENCE = /^HW-WA-\d{6}-[A-Z0-9]{6}$/

/** YYMMDD in UK time. */
export function ukDatePart(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}${get('month')}${get('day')}`
}

/** HW-WA-261007-K7P2QX: the UK date, then six random characters. */
export function mintReference(now = new Date(), randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const suffix = Array.from(randomBytes(6), (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join('')
  return `HW-WA-${ukDatePart(now)}-${suffix}`
}

/** The reference goes on its own line at the end, apart from what the customer reads. */
export const withReference = (message: string, reference: string) => `${message}\n\nRef: ${reference}`

export type Platform = 'ios-in-app' | 'android-in-app' | 'other'

const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Threads|Barcelona/i

export function platformOf(userAgent: string): Platform {
  if (!IN_APP.test(userAgent)) return 'other'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios-in-app'
  if (/Android/i.test(userAgent)) return 'android-in-app'
  return 'other'
}

export interface WhatsAppLaunch {
  /** Where to go first. */
  url: string
  /** Where to go if the app didn't open (iPhone only). */
  fallback: string | null
}

export function whatsAppLaunch(number: string, text: string, platform: Platform): WhatsAppLaunch {
  const encoded = encodeURIComponent(text)
  const web = `https://wa.me/${number}?text=${encoded}`
  if (platform === 'ios-in-app') return { url: `whatsapp://send?phone=${number}&text=${encoded}`, fallback: web }
  if (platform === 'android-in-app') {
    return { url: `intent://send?phone=${number}&text=${encoded}#Intent;scheme=whatsapp;S.browser_fallback_url=${encodeURIComponent(web)};end`, fallback: null }
  }
  return { url: web, fallback: null }
}
