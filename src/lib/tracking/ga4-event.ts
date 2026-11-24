// GA4 purchases sent from the server (Measurement Protocol), so revenue in
// GA4 comes from the database rather than the browser. Pure, for tests.
//
// transaction_id is the order's random purchase event ID, never its order ID
// or HW reference. Customers who didn't accept analytics cookies still count
// as revenue, under a one-off anonymous client ID that links to nobody.

import { createHash } from 'node:crypto'

/** "GA1.1.123456789.1700000000" (the _ga cookie) -> "123456789.1700000000". */
export function ga4ClientIdFromCookie(raw: string | null | undefined): string | null {
  const m = /^GA\d\.\d\.(\d+\.\d+)$/.exec(raw?.trim() ?? '')
  return m ? m[1]! : null
}

/**
 * GA4's session ID from the stream's own cookie (_ga_<id>): "GS1.1.1732466000.3.1..." or
 * "GS2.1.s1732466000$o3$g1...". Sent with the purchase so GA4 joins it to the visit's
 * session (Run 4: purchases sent without it showed source "(not set)").
 */
export function ga4SessionIdFromCookie(raw: string | null | undefined): string | null {
  const v = raw?.trim() ?? ''
  const m = /^GS1\.\d\.(\d{6,20})\./.exec(v) ?? /^GS2\.\d\.s(\d{6,20})(?:\$|$)/.exec(v)
  return m ? m[1]! : null
}

/** The stream cookie's name for a measurement ID: "G-ABC123" -> "_ga_ABC123". */
export const ga4StreamCookie = (measurementId: string | null) => (measurementId && /^G-[A-Z0-9]+$/.test(measurementId) ? `_ga_${measurementId.slice(2)}` : null)

/** A stable, meaningless client ID derived from the event ID: same order, same ID, so retries can't double count. */
export function anonymousClientId(seed: string): string {
  const h = createHash('sha256').update(`hw-anon:${seed}`).digest()
  return `${h.readUInt32BE(0)}.${h.readUInt32BE(4) % 2_000_000_000}`
}

export interface Ga4Item {
  variantId: string | null
  title: string
  option: string | null
  quantity: number
  unitPrice: number
}

export function ga4Purchase(o: { eventId: string; clientId: string | null; sessionId?: string | null; consented: boolean; time: Date; value: number; items: Ga4Item[] }, now = new Date()) {
  // GA4 accepts events up to 72 hours old; older ones are stamped "now" instead.
  const recent = now.getTime() - o.time.getTime() < 71 * 60 * 60 * 1000
  const consent = o.consented ? 'GRANTED' : 'DENIED'
  return {
    client_id: o.clientId ?? anonymousClientId(o.eventId),
    ...(recent ? { timestamp_micros: o.time.getTime() * 1000 } : {}),
    consent: { ad_user_data: consent, ad_personalization: consent },
    events: [
      {
        name: 'purchase',
        params: {
          currency: 'GBP',
          value: Math.round(o.value * 100) / 100,
          transaction_id: o.eventId,
          // Joins the purchase to the visit's GA4 session (only with the consented client ID it belongs to).
          ...(o.sessionId && o.clientId ? { session_id: o.sessionId, engagement_time_msec: 1 } : {}),
          items: o.items.map((i) => ({
            item_id: i.variantId ?? 'custom',
            item_name: i.title,
            ...(i.option ? { item_variant: i.option } : {}),
            price: i.unitPrice,
            quantity: i.quantity,
          })),
        },
      },
    ],
  }
}
