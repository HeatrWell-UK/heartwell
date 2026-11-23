// Christmas delivery, honestly (Run 2, owner 24 November 2026). The site
// promises a before-Christmas delivery only once the owner has set the real
// facts in Admin → Settings: the last delivery day before Christmas and, for
// made-to-order pieces, the making time. Until then it offers a real check on
// WhatsApp instead of a date. Pure: shared by the product page and tests.

export interface ChristmasFacts {
  /** The last day the van delivers before Christmas (YYYY-MM-DD), or null: not verified. */
  lastDeliveryDate: string | null
  /** Extra days the shop doesn't deliver (YYYY-MM-DD). */
  closedDates: string[]
  /** Working days to make a made-to-order piece, or null: not verified. */
  madeToOrderLeadDays: number | null
  /** The longest standard delivery window, in working days (shop_settings.delivery_max_working_days). */
  maxWorkingDays: number
  /** Weekdays with no delivery (0 Sunday … 6 Saturday; Monday = 1). */
  noDeliveryDays: number[]
}

export type ChristmasDelivery =
  | { kind: 'hidden' }
  /** Facts missing: no date, a real check instead. */
  | { kind: 'ask' }
  /** Order by this UK date (YYYY-MM-DD) for most mainland postcodes. */
  | { kind: 'order_by'; date: string }
  /** That date has passed. */
  | { kind: 'too_late' }

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Steps back from a date by working days, skipping the shop's no-delivery weekdays and closed dates. */
export function backWorkingDays(fromIso: string, days: number, facts: Pick<ChristmasFacts, 'closedDates' | 'noDeliveryDays'>): string {
  const d = new Date(`${fromIso}T12:00:00Z`)
  const closed = new Set(facts.closedDates)
  let left = days
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() - 1)
    if (facts.noDeliveryDays.includes(d.getUTCDay()) || closed.has(iso(d))) continue
    left -= 1
  }
  return iso(d)
}

/**
 * What to say about Christmas delivery on a piece, during the Christmas part
 * of the event only. "Order by" = the last delivery day, minus the making time
 * for made-to-order pieces, minus the longest delivery window. Charged areas
 * (5–7 working days) are told to check, never promised.
 */
export function christmasDelivery(facts: ChristmasFacts, opts: { christmasPhase: boolean; madeToOrder: boolean; todayIso: string }): ChristmasDelivery {
  if (!opts.christmasPhase) return { kind: 'hidden' }
  if (!facts.lastDeliveryDate) return { kind: 'ask' }
  if (opts.madeToOrder && facts.madeToOrderLeadDays === null) return { kind: 'ask' }
  const lead = (opts.madeToOrder ? (facts.madeToOrderLeadDays ?? 0) : 0) + facts.maxWorkingDays
  const date = backWorkingDays(facts.lastDeliveryDate, lead, facts)
  return opts.todayIso > date ? { kind: 'too_late' } : { kind: 'order_by', date }
}
