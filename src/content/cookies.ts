// Everything the shop stores on a visitor's device, for the Cookies page.
// tests/content.test.ts checks that every "hw-…" key in the code is listed
// here, so a new cookie can't go unmentioned.

import { CONSENT_MAX_AGE } from '@/lib/tracking/consent'
import { LIVE_DOMAIN } from '@/config/site'

export type StorageKind = 'cookie' | 'local storage' | 'session storage'

export interface StoredItem {
  name: string
  kind: StorageKind
  purpose: string
  lasts: string
}

export interface StorageGroup {
  id: string
  title: string
  intro: string
  items: StoredItem[]
}

const CONSENT_MONTHS = Math.round(CONSENT_MAX_AGE / (30 * 24 * 60 * 60))

export const STORAGE_GROUPS: StorageGroup[] = [
  {
    id: 'needed',
    title: 'Needed for the shop',
    intro: 'These make the shop work, so they’re always on. None of them is shared with anyone.',
    items: [
      { name: 'hw-consent', kind: 'cookie', purpose: 'Remembers your cookie choices.', lasts: `${CONSENT_MONTHS} months` },
      { name: 'hw-basket-v1', kind: 'local storage', purpose: 'Your basket, so it’s still there if the app or browser closes.', lasts: 'Until you empty it or clear your browser' },
      { name: 'hw-saved-v1', kind: 'local storage', purpose: 'The sofas you saved.', lasts: 'Until you remove them or clear your browser' },
      { name: 'hw-postcode', kind: 'local storage', purpose: 'The postcode you checked, so delivery dates and checkout can use it.', lasts: 'Until you clear your browser' },
      { name: 'hw-wa-ref', kind: 'local storage', purpose: 'Your last WhatsApp enquiry reference, so a second tap doesn’t start a new one.', lasts: 'Until you clear your browser' },
      { name: 'hw-offer', kind: 'cookie', purpose: 'Your offer from one of our adverts, so it applies at checkout.', lasts: 'Until the offer ends (up to a week or so)' },
      { name: 'hw-offer-until', kind: 'cookie', purpose: 'When that offer ends, to show it on the page.', lasts: 'Until the offer ends' },
      { name: 'hw-offer-claimed', kind: 'session storage', purpose: 'Stops the shop asking for the same offer twice.', lasts: 'Until you close the tab' },
    ],
  },
  {
    id: 'statistics',
    title: 'Our own visit statistics',
    intro:
      'Which campaigns and pages bring visitors, and which visits lead to orders. Kept by us alone and never used for advertising. On unless you switch them off in Cookie settings; switched off, we stop recording your visits, though the device ID can still link an order or an ad offer to this device.',
    items: [
      { name: 'hw-visitor', kind: 'local storage', purpose: 'A random ID for this device, linking your visits, ad offer and orders.', lasts: 'Until you clear your browser' },
      { name: 'hw-session', kind: 'session storage', purpose: 'A random ID for this visit.', lasts: 'Until you close the tab' },
      { name: 'hw-arrival', kind: 'session storage', purpose: 'A random ID for how this visit began.', lasts: 'Until you close the tab' },
      { name: 'hw-arrival-sent', kind: 'session storage', purpose: 'Notes that this visit has been counted.', lasts: 'Until you close the tab' },
      { name: 'hw-touch', kind: 'local storage', purpose: 'The campaign tags, landing page and referring site of your first and latest visits.', lasts: 'Until you clear your browser' },
      {
        name: 'hw-fbclid',
        kind: 'session storage',
        purpose: 'The click ID Facebook adds to links. It stays on your device and only reaches our records if you accept marketing cookies.',
        lasts: 'Until you close the tab',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Google Analytics',
    intro: `Only if you accept them, and only on ${LIVE_DOMAIN}.`,
    items: [
      { name: '_ga', kind: 'cookie', purpose: 'Google Analytics: tells visits apart.', lasts: 'Up to 2 years' },
      { name: '_ga_…', kind: 'cookie', purpose: 'Google Analytics: keeps track of a visit.', lasts: 'Up to 2 years' },
    ],
  },
  {
    id: 'marketing',
    title: 'Facebook and Instagram adverts',
    intro: `Meta’s Pixel, only if you accept it, and only on ${LIVE_DOMAIN}. It tells Meta which adverts lead to visits and orders.`,
    items: [
      { name: '_fbp', kind: 'cookie', purpose: 'Meta: tells visits from this browser apart.', lasts: '3 months' },
      { name: '_fbc', kind: 'cookie', purpose: 'Meta: the advert you clicked, if you came from one.', lasts: '3 months' },
    ],
  },
  {
    id: 'staff',
    title: 'For our staff only',
    intro: 'Customers never get these.',
    items: [
      { name: 'hw-staff', kind: 'cookie', purpose: 'Marks a staff device, so its visits and orders never count.', lasts: 'About a year' },
      { name: 'hw-qa', kind: 'session storage', purpose: 'Marks a test visit (a link ending in qa=1), so it never counts.', lasts: 'Until you close the tab' },
      { name: 'sb-…', kind: 'cookie', purpose: 'Keeps staff signed in to the admin.', lasts: 'While signed in' },
    ],
  },
]

/** Every name listed, for the completeness test. */
export const LISTED_NAMES = STORAGE_GROUPS.flatMap((g) => g.items.map((i) => i.name))
