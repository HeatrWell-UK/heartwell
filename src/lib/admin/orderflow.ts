// OrderFlow in the admin, in words. Pure, so it's tested.

export interface PushRow {
  checked_at: string | null
  error: string | null
  outcome: string | null
  status_code: number | null
}

/** One push: accepted, refused (and why), or still waiting for OrderFlow's reply. */
export function pushVerdict(p: PushRow): { tone: 'ok' | 'bad' | 'wait'; text: string } {
  if (!p.checked_at) return { tone: 'wait', text: 'Waiting for OrderFlow’s reply' }
  if (p.error) return { tone: 'bad', text: p.error }
  return { tone: 'ok', text: `Accepted${p.outcome ? `: ${p.outcome}` : ''}` }
}

/** The status words OrderFlow receives, verbatim, with what each means here. */
export const ORDER_STATUSES = [
  { status: 'pending_cod', meaning: 'Placed online, waiting for the customer to tap Confirm (not a firm order yet)' },
  { status: 'confirmed', meaning: 'Confirmed by the customer (or by staff for a phone or WhatsApp order)' },
  { status: 'processing', meaning: 'Being prepared, or being made for a made-to-order piece' },
  { status: 'shipped', meaning: 'Out for delivery' },
  { status: 'delivered', meaning: 'Delivered and paid' },
  { status: 'cancelled', meaning: 'Cancelled (the reason is kept here)' },
] as const
