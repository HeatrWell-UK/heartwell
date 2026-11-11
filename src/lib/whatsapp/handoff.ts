// WhatsApp from the shop: the HW-WA reference that ties a chat back to the
// page and product it started from, and the link that opens WhatsApp most
// reliably from where the customer is.
//
// The reference is made in the browser at the moment of the tap, so WhatsApp
// opens straight away; the enquiry is saved in the background with the same
// reference (the database accepts it in the same format it makes itself).
//
// Opening WhatsApp: the plain https://wa.me link, tapped like any link, in
// every browser, the Facebook and Instagram apps included (see whatsAppLaunch:
// their own whatsapp:// and intent:// links were measured failing there).

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

/** The product photo's "Need more Photos?" message. The code is the SKU the shop and the warehouse know. */
export function morePhotosMessage({ title, option, code, url }: { title: string; option: string; code: string | null; url: string }): string {
  return [`Hi Heartwell, please send me more pictures/videos of "${title}" (${option}).`, ...(code ? [`Product code: ${code}`] : []), url].join('\n')
}

export type Platform = 'ios-in-app' | 'android-in-app' | 'other'

/** A hand-off note (src/lib/whatsapp/help.ts): the reference and the kind of browser, e.g. "HW-WA-261110-K7P2QX ios-in-app". */
export const handoffNote = (reference: string | null, platform: Platform, retry = false) => [reference, platform, retry ? 'retry' : null].filter(Boolean).join(' ')

/** The reference a hand-off note is about, or null. */
export function noteReference(note: string | null | undefined): string | null {
  const first = note?.split(' ')[0] ?? ''
  return WA_REFERENCE.test(first) ? first : null
}

const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Threads|Barcelona/i

export function platformOf(userAgent: string): Platform {
  if (!IN_APP.test(userAgent)) return 'other'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios-in-app'
  if (/Android/i.test(userAgent)) return 'android-in-app'
  return 'other'
}

export interface WhatsAppLaunch {
  /** The plain wa.me link with the message. */
  url: string
  /** A new tab in ordinary browsers; the same page in the Facebook and Instagram apps, where that is what opens WhatsApp. */
  newTab: boolean
}

/**
 * How a tap opens WhatsApp: the plain wa.me link, followed as an ordinary tap
 * on a link, everywhere (11 November 2026). The hand-off notes showed the app's
 * own links failing inside the Facebook app: `whatsapp://` on iPhone didn't
 * open WhatsApp in 6 taps out of 6, nor `intent://` on a Samsung (1 of 1),
 * while the plain link opened it from Facebook on iPhone and from Chrome.
 */
export function whatsAppLaunch(number: string, text: string, platform: Platform): WhatsAppLaunch {
  return { url: `https://wa.me/${number}?text=${encodeURIComponent(text)}`, newTab: platform === 'other' }
}
