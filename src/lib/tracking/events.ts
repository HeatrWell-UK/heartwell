// The shop's funnel events, by Meta's name, and what GA4 calls each. Purchase
// and OrderDelivered aren't here: they go from the server only, once the
// order is confirmed or delivered (the conversion outbox).

export const BROWSER_EVENTS = ['ViewContent', 'AddToCart', 'InitiateCheckout', 'Contact', 'Lead', 'OrderPlaced'] as const
export type BrowserEventName = (typeof BROWSER_EVENTS)[number]

/** Meta's standard events go through fbq('track'); ours through fbq('trackCustom'). */
export const META_CUSTOM: ReadonlySet<BrowserEventName> = new Set(['OrderPlaced'])

export const GA4_NAME: Record<BrowserEventName, string> = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Contact: 'contact',
  Lead: 'generate_lead',
  OrderPlaced: 'order_placed',
}

export interface EventData {
  value?: number
  contentIds?: string[]
  contents?: { id: string; quantity: number; item_price: number }[]
  contentName?: string
  numItems?: number
}

/** Pixel parameters (Meta's names). */
export function pixelParams(d: EventData): Record<string, unknown> {
  const ids = d.contentIds ?? d.contents?.map((c) => c.id)
  return {
    currency: 'GBP',
    ...(d.value !== undefined ? { value: Math.round(d.value * 100) / 100 } : {}),
    ...(ids?.length ? { content_type: 'product', content_ids: ids } : {}),
    ...(d.contents?.length ? { contents: d.contents } : {}),
    ...(d.contentName ? { content_name: d.contentName } : {}),
    ...(d.numItems ? { num_items: d.numItems } : {}),
  }
}

/** GA4 parameters. */
export function ga4Params(d: EventData): Record<string, unknown> {
  const items = d.contents?.length
    ? d.contents.map((c) => ({ item_id: c.id, price: c.item_price, quantity: c.quantity, ...(d.contentName ? { item_name: d.contentName } : {}) }))
    : d.contentIds?.map((id) => ({ item_id: id, ...(d.contentName ? { item_name: d.contentName } : {}) }))
  return {
    currency: 'GBP',
    ...(d.value !== undefined ? { value: Math.round(d.value * 100) / 100 } : {}),
    ...(items?.length ? { items } : {}),
  }
}
