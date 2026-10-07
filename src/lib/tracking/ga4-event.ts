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

export function ga4Purchase(o: { eventId: string; clientId: string | null; consented: boolean; time: Date; value: number; items: Ga4Item[] }, now = new Date()) {
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
