// The automatic offer for visitors who arrive from an ad (decision D6), and
// the offer tiers. Pure: shared by the browser, the server and tests.
//
// A visit counts as "from an ad" only when its address carries our ad tags:
// - Meta ads: utm_source facebook/instagram/meta with utm_medium paid_social
//   (the URL parameters on Admin → Ad links). utm_campaign "catalogue" is how
//   the catalogue feed's links say they came from a catalogue ad.
// - Google ads: gclid/gbraid/wbraid, or utm_source google with utm_medium cpc.
// fbclid alone proves nothing: Facebook adds it to ordinary shared links too.
//
// When a tag appears twice, the last one counts: Meta appends an ad's URL
// parameters after the catalogue link's own tags, and the ad's are the more
// specific.

export type OfferSource = 'meta_ads' | 'meta_catalog' | 'google_ads'
export type OfferTier = 'HIGH' | 'MID' | 'STANDARD' | 'EXCLUDED'

/** httpOnly: the entitlement token checkout sends to the database. */
export const OFFER_COOKIE = 'hw-offer'
/** Readable by the page: when the offer ends (ISO), so strips can show it. */
export const OFFER_UNTIL_COOKIE = 'hw-offer-until'

/** The tags on every Meta ad and catalogue link (the ad's own name tags are added by Meta). */
export const META_AD_TAGS = { utm_source: 'facebook', utm_medium: 'paid_social' } as const
export const CATALOGUE_CAMPAIGN = 'catalogue'

const META_SOURCES = new Set(['facebook', 'instagram', 'meta', 'fb', 'ig'])

/** A tag's value, the last one when it appears more than once; lower case, trimmed. */
export function lastParam(q: URLSearchParams, key: string): string {
  const values = q
    .getAll(key)
    .map((v) => v.trim())
    .filter(Boolean)
  return (values.at(-1) ?? '').toLowerCase()
}

/** Which kind of ad (if any) this address came from. */
export function classifyPaidLanding(search: string): OfferSource | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (['gclid', 'gbraid', 'wbraid'].some((k) => lastParam(q, k))) return 'google_ads'
  const source = lastParam(q, 'utm_source')
  const medium = lastParam(q, 'utm_medium')
  if (source === 'google' && medium === 'cpc') return 'google_ads'
  if (META_SOURCES.has(source) && medium === 'paid_social') {
    return lastParam(q, 'utm_campaign') === CATALOGUE_CAMPAIGN ? 'meta_catalog' : 'meta_ads'
  }
  return null
}

export interface TierAmounts {
  HIGH: number
  MID: number
  STANDARD: number
}

const TIER_RANK: Record<OfferTier, number> = { HIGH: 4, MID: 3, STANDARD: 2, EXCLUDED: 1 }

/** Pounds off for one product's tier (nothing for excluded or untiered products). */
export function tierAmount(tier: OfferTier | null | undefined, amounts: TierAmounts): number {
  return tier && tier !== 'EXCLUDED' ? amounts[tier] : 0
}

/**
 * What an offer takes off a basket, worked out as the database does: the
 * best tier among its pieces sets the amount, never more than the goods
 * cost. For display only; checkout's figure comes from the database.
 */
export function basketOfferAmount(lines: { tier: OfferTier | null; lineTotal: number }[], amounts: TierAmounts): number {
  const tiers = lines.map((l) => l.tier).filter((t): t is OfferTier => t !== null)
  if (tiers.length === 0) return 0
  const best = tiers.reduce((a, b) => (TIER_RANK[b] > TIER_RANK[a] ? b : a))
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  return Math.min(subtotal, tierAmount(best, amounts))
}

/** The offer's end date from its cookie, or null when there's none or it has passed. */
export function offerEnds(raw: string | null | undefined, now = Date.now()): Date | null {
  if (!raw) return null
  const at = new Date(raw)
  return Number.isNaN(at.getTime()) || at.getTime() <= now ? null : at
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The entitlement token from its cookie, when it looks like one. */
export const offerToken = (raw: string | null | undefined): string | null => (raw && UUID.test(raw) ? raw.toLowerCase() : null)
