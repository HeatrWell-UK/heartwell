// An order's journey as the customer sees it: placed, confirmed, delivered
// (the shop's three stages since 17 November 2026), which are done, which one
// is next and what happens there.
// Worked out from the order's status (and its dates, where the page has them).
// A pure function, so it's tested.

export type JourneyState = 'done' | 'current' | 'upcoming'

export interface JourneyStep {
  key: 'placed' | 'confirmed' | 'delivered'
  label: string
  state: JourneyState
  /** When it happened (ISO), if the page knows. */
  at: string | null
  /** What happens at the step that's next, in a line. */
  hint: string | null
}

const STEPS: { key: JourneyStep['key']; label: string; hint: string }[] = [
  { key: 'placed', label: 'Order placed', hint: '' },
  { key: 'confirmed', label: 'Confirmed by you', hint: 'Tap Ask for confirmation: we send your details back on WhatsApp with a link to check them and press Confirm.' },
  { key: 'delivered', label: 'Delivered', hint: 'We ring you to book your delivery day. Look it over, then pay the driver in full, in cash or by bank transfer.' },
]

/** How far each status has got: the index of the last step it has reached (the old processing and shipped stages count as confirmed). */
const REACHED: Record<string, number> = { pending_cod: 0, confirmed: 1, processing: 1, shipped: 1, delivered: 2 }

export interface JourneyTimes {
  createdAt?: string | null
  confirmedAt?: string | null
  processingAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
}

/** The journey for an order; null for a cancelled order (or a status the shop doesn't know), which isn't on one. */
export function orderJourney(status: string, times: JourneyTimes = {}): JourneyStep[] | null {
  const reached = REACHED[status]
  if (reached === undefined) return null
  const at: Record<JourneyStep['key'], string | null> = {
    placed: times.createdAt ?? null,
    confirmed: times.confirmedAt ?? null,
    delivered: times.deliveredAt ?? null,
  }
  return STEPS.map((s, i) => {
    const state: JourneyState = i <= reached ? 'done' : i === reached + 1 ? 'current' : 'upcoming'
    return { key: s.key, label: s.label, state, at: state === 'done' ? at[s.key] : null, hint: state === 'current' ? s.hint : null }
  })
}
