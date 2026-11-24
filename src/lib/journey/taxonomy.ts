// The journey taxonomy (Run 3): the only events and codes the shop's own
// Journeys report may hold. Codes, never content: no names, phone numbers,
// emails, postcodes, typed text or query strings. Shared by the browser, the
// /api/journey route (which refuses anything else) and the tests. The
// database's CHECK constraint (migration journeys_reports) backs the key list.

export const JOURNEY_EVENTS = [
  'page_view',
  'scroll_depth',
  'cta_click',
  'option_select',
  'image_interact',
  'search',
  'filter',
  'basket_add',
  'checkout_view',
  'checkout_step',
  'field_focus',
  'field_complete',
  'validation_error',
  'postcode_check',
  'delivery_fee_shown',
  'whatsapp_click',
  'phone_click',
  'callback_request',
  'back_to_basket',
  'place_order',
  'page_exit',
] as const
export type JourneyEvent = (typeof JOURNEY_EVENTS)[number]

export const PAGE_TYPES = ['home', 'product', 'range', 'category', 'sale', 'season', 'search', 'basket', 'checkout', 'order', 'info', 'other'] as const
export type PageType = (typeof PAGE_TYPES)[number]

export const FIELD_CATEGORIES = ['name', 'phone', 'email', 'postcode', 'address', 'delivery_date', 'delivery_options', 'notes', 'consent', 'code', 'other'] as const
export type FieldCategory = (typeof FIELD_CATEGORIES)[number]

export const OUTCOMES = ['attempted', 'success', 'saved', 'failed', 'covered', 'charged', 'not_covered', 'invalid', 'opened'] as const
export type Outcome = (typeof OUTCOMES)[number]

/** A short code: lower-case letters, digits and underscores (never typed text). */
export const CODE = /^[a-z0-9_]{1,40}$/

/** The kind of page from its path (no query string ever reaches here). */
export function pageTypeFor(path: string): PageType {
  const p = path.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/'
  if (p === '/') return 'home'
  if (p.startsWith('/products/')) return 'product'
  if (p.startsWith('/ranges')) return 'range'
  if (p === '/sale') return 'sale'
  if (p === '/christmas' || p === '/new-year') return 'season'
  if (p.startsWith('/search')) return 'search'
  if (p === '/basket') return 'basket'
  if (p.startsWith('/checkout')) return 'checkout'
  if (p.startsWith('/order') || p.startsWith('/confirm-order') || p.startsWith('/track-order')) return 'order'
  if (/^\/(about|faq|delivery-and-returns|care-guide|guides|contact|reviews|visit-us|will-it-fit|fabrics|fabric-samples|terms|privacy|cookies)(\/|$)/.test(p)) return 'info'
  if (/^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(p)) return 'category'
  return 'other'
}

/** Which kind of field, from its name or autocomplete hint. Never its value. */
export function fieldCategoryFor(name: string, autocomplete = ''): FieldCategory {
  const s = `${name} ${autocomplete}`.toLowerCase()
  if (/postcode|postal/.test(s)) return 'postcode'
  if (/phone|tel/.test(s)) return 'phone'
  if (/email/.test(s)) return 'email'
  if (/name/.test(s)) return 'name'
  if (/address|street|town|city|line/.test(s)) return 'address'
  if (/date|day/.test(s)) return 'delivery_date'
  if (/floor|lift|assembly|removal|upstairs/.test(s)) return 'delivery_options'
  if (/note|instruction|message/.test(s)) return 'notes'
  if (/consent|agree|terms|newsletter/.test(s)) return 'consent'
  if (/code|promo|voucher/.test(s)) return 'code'
  return 'other'
}

/** A browser validity state as one error code. */
export function errorCodeFor(v: Pick<ValidityState, 'valueMissing' | 'typeMismatch' | 'patternMismatch' | 'tooShort' | 'tooLong' | 'rangeUnderflow' | 'rangeOverflow'>): string {
  if (v.valueMissing) return 'missing'
  if (v.typeMismatch) return 'wrong_format'
  if (v.patternMismatch) return 'wrong_format'
  if (v.tooShort) return 'too_short'
  if (v.tooLong) return 'too_long'
  if (v.rangeUnderflow || v.rangeOverflow) return 'out_of_range'
  return 'invalid'
}

/** Scroll milestones, each sent once per page view. */
export const SCROLL_MILESTONES = [25, 50, 75, 100] as const
