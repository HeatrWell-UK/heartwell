// Which postcodes the free UK Mainland checkout covers.
//
// The TypeScript copy of public.classify_postcode, so pages can answer
// instantly. The database runs its own copy again before taking an order, and
// tests/delivery-parity.test.ts holds both to the same answers.
//
// Non-mainland addresses are never refused: they go to a WhatsApp quote.

export type DeliveryZone = 'MAINLAND_STANDARD' | 'CUSTOM_QUOTE'

export type PostcodeReason =
  | 'mainland'
  | 'northern_ireland'
  | 'isle_of_man'
  | 'channel_islands'
  | 'special_or_overseas'
  | 'isle_of_wight'
  | 'isles_of_scilly'
  | 'scottish_island'
  | 'mixed_geography_island'
  | 'mixed_geography_mainland'

export type PostcodeClassification =
  | { kind: 'invalid'; postcode: string; reason: 'invalid_format' | 'postcode_not_found' }
  | { kind: 'ambiguous'; postcode: string; reason: 'mixed_geography' }
  | { kind: 'classified'; postcode: string; zone: DeliveryZone; reason: PostcodeReason | 'mixed_geography_unavailable' }

/** Evidence from the address lookup for the two mixed districts. Never customer-typed text. */
export type MixedAreaEvidence = 'island' | 'mainland'

/** "m11ae" -> "M1 1AE". Matches public.normalise_postcode. */
export function normalisePostcode(raw: string): string {
  const clean = raw.toUpperCase().replace(/\s+/g, '')
  return clean.length < 5 ? clean : `${clean.slice(0, -3)} ${clean.slice(-3)}`
}

const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?|ASCN|STHL|TDCU|BBND|[BFS]IQQ|PCRN|TKCA) \d[A-Z]{2}$/

export function isValidUkPostcode(raw: string): boolean {
  return UK_POSTCODE.test(normalisePostcode(raw))
}

/** "M1 1AE" -> "M1". */
export function outwardCode(raw: string): string {
  return normalisePostcode(raw).split(' ')[0] ?? ''
}

const SPECIAL_OR_OVERSEAS = new Set(['BF', 'BX', 'ZZ', 'ASCN', 'STHL', 'TDCU', 'BBND', 'BIQQ', 'FIQQ', 'SIQQ', 'PCRN', 'TKCA'])

/** Raasay units in the otherwise mixed IV40 district. */
const RAASAY_UNITS = new Set([
  'IV40 8NG', 'IV40 8NS', 'IV40 8NT', 'IV40 8NU', 'IV40 8NX', 'IV40 8NY', 'IV40 8NZ',
  'IV40 8PA', 'IV40 8PB', 'IV40 8PD', 'IV40 8PE', 'IV40 8PF', 'IV40 8PG',
])

/** Island places in PA34, matched only against addresses from the postcode lookup. */
const PA34_ISLAND_TERMS = [
  'EASDALE', 'KERRERA', 'LISMORE', 'LUING', 'SEIL', 'BALVICAR', 'ELLENABEICH', 'SOUTH CUAN', 'CUAN FERRY',
  'CULLIPOOL', 'TOBERONOCHY', 'SHUNA', 'PORT RAMSAY', 'ACHNACROISH', 'ACHINDUIN', 'BALIGRUNDLE',
]

export const MIXED_DISTRICTS = new Set(['IV40', 'PA34'])

const between = (n: number | null, lo: number, hi: number) => n !== null && n >= lo && n <= hi

function classified(postcode: string, zone: DeliveryZone, reason: PostcodeReason): PostcodeClassification {
  return { kind: 'classified', postcode, zone, reason }
}

export function classifyDeliveryPostcode(raw: string, evidence: MixedAreaEvidence | null = null): PostcodeClassification {
  const postcode = normalisePostcode(raw)
  if (!UK_POSTCODE.test(postcode)) return { kind: 'invalid', postcode, reason: 'invalid_format' }

  const outward = outwardCode(postcode)
  const area = outward.match(/^[A-Z]+/)?.[0] ?? ''
  const digits = outward.slice(area.length).match(/^\d{1,2}/)?.[0]
  const district = digits === undefined ? null : Number(digits)

  if (area === 'BT') return classified(postcode, 'CUSTOM_QUOTE', 'northern_ireland')
  if (area === 'IM') return classified(postcode, 'CUSTOM_QUOTE', 'isle_of_man')
  if (area === 'JE' || area === 'GY') return classified(postcode, 'CUSTOM_QUOTE', 'channel_islands')
  if (SPECIAL_OR_OVERSEAS.has(area) || outward === 'GX11') return classified(postcode, 'CUSTOM_QUOTE', 'special_or_overseas')
  if (area === 'PO' && between(district, 30, 41)) return classified(postcode, 'CUSTOM_QUOTE', 'isle_of_wight')
  if (area === 'TR' && between(district, 21, 25)) return classified(postcode, 'CUSTOM_QUOTE', 'isles_of_scilly')
  if (
    area === 'HS' ||
    area === 'ZE' ||
    (area === 'KA' && between(district, 27, 28)) ||
    (area === 'KW' && between(district, 15, 17)) ||
    (area === 'PH' && between(district, 42, 44)) ||
    (area === 'PA' && (district === 20 || between(district, 41, 49) || between(district, 60, 78))) ||
    (area === 'IV' && (between(district, 41, 49) || district === 51 || between(district, 55, 56)))
  ) {
    return classified(postcode, 'CUSTOM_QUOTE', 'scottish_island')
  }

  if (MIXED_DISTRICTS.has(outward)) {
    if ((outward === 'IV40' && RAASAY_UNITS.has(postcode)) || evidence === 'island') {
      return classified(postcode, 'CUSTOM_QUOTE', 'mixed_geography_island')
    }
    if (evidence === 'mainland') return classified(postcode, 'MAINLAND_STANDARD', 'mixed_geography_mainland')
    return { kind: 'ambiguous', postcode, reason: 'mixed_geography' }
  }

  return classified(postcode, 'MAINLAND_STANDARD', 'mainland')
}

/** Island or mainland, read from the addresses the postcode lookup returned. */
export function evidenceFromAddresses(postcode: string, addresses: string[]): MixedAreaEvidence | null {
  if (addresses.length === 0) return null
  const outward = outwardCode(postcode)
  const text = addresses.join('\n').toUpperCase()
  const island =
    (outward === 'IV40' && text.includes('RAASAY')) || (outward === 'PA34' && PA34_ISLAND_TERMS.some((t) => text.includes(t)))
  return island ? 'island' : 'mainland'
}

/**
 * The full decision for checkout. Only the two mixed districts need the
 * address lookup; if it's unavailable the answer is a custom quote, never a
 * guess. A genuine "not found" is an invalid postcode.
 */
export async function resolveDeliveryPostcode(
  raw: string,
  lookupAddresses: (postcode: string) => Promise<string[]>,
): Promise<{ classification: PostcodeClassification; evidence: MixedAreaEvidence | null }> {
  const first = classifyDeliveryPostcode(raw)
  if (first.kind !== 'ambiguous') return { classification: first, evidence: null }
  try {
    const evidence = evidenceFromAddresses(first.postcode, await lookupAddresses(first.postcode))
    return { classification: classifyDeliveryPostcode(first.postcode, evidence), evidence }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/not found|no addresses/i.test(message)) {
      return { classification: { kind: 'invalid', postcode: first.postcode, reason: 'postcode_not_found' }, evidence: null }
    }
    return {
      classification: { kind: 'classified', postcode: first.postcode, zone: 'CUSTOM_QUOTE', reason: 'mixed_geography_unavailable' },
      evidence: null,
    }
  }
}

/** True only when the free UK Mainland checkout applies. Ambiguous is not mainland. */
export function isMainland(raw: string, evidence: MixedAreaEvidence | null = null): boolean {
  const result = classifyDeliveryPostcode(raw, evidence)
  return result.kind === 'classified' && result.zone === 'MAINLAND_STANDARD'
}
