'use server'

import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { trackOrder, type TrackedOrder } from '@/lib/checkout/read'

export type TrackState = { status: 'idle' } | { status: 'found'; order: TrackedOrder } | { status: 'not_found' } | { status: 'busy' } | { status: 'error' }

/** Looks an order up by its HW reference and postcode, sent as a form post so the postcode is never in an address. */
export async function track(_: TrackState, form: FormData): Promise<TrackState> {
  const reference = String(form.get('reference') ?? '').slice(0, 20)
  const postcode = String(form.get('postcode') ?? '').slice(0, 10)
  // Tight, because a reference and postcode pair is what keeps an order private.
  if (!rateLimit(`track:${await clientIp()}`, 15, 10 * 60_000)) return { status: 'busy' }
  try {
    const order = await trackOrder(reference, postcode)
    return order ? { status: 'found', order } : { status: 'not_found' }
  } catch {
    return { status: 'error' }
  }
}
