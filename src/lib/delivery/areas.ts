// Where delivery isn't free (owner, 17 October 2026).
//
// The TypeScript side of public.delivery_area: a charged area is a list of
// mainland postcode districts with its own charge and delivery time. The list
// lives in the delivery_areas table; the database adds the charge itself when
// it prices an order, so this copy only shows it sooner.

import { formatPrice } from '@/lib/format'
import { outwardCode } from './postcode'

export interface DeliveryArea {
  slug: string
  name: string
  /** Towns customers will recognise, e.g. "Exeter, Plymouth, Torquay". */
  places: string
  charge: number
  minWorkingDays: number
  maxWorkingDays: number
  /** Outward codes, e.g. "EX4". */
  districts: string[]
}

/** The charged area a postcode is in, or null for the free rest of the mainland. */
export function areaForPostcode<A extends DeliveryArea>(postcode: string, areas: readonly A[]): A | null {
  const district = outwardCode(postcode)
  if (!district) return null
  return areas.find((a) => a.districts.includes(district)) ?? null
}

/** "£40 to £100", or "£80" when every area costs the same. Empty when there are none. */
export function chargeRange(areas: readonly DeliveryArea[]): string {
  if (areas.length === 0) return ''
  const charges = areas.map((a) => a.charge)
  const low = Math.min(...charges)
  const high = Math.max(...charges)
  return low === high ? formatPrice(low) : `${formatPrice(low)} to ${formatPrice(high)}`
}

/**
 * An order's delivery line, as the customer sees it: a charged area's price
 * (plus anything staff added by hand), any charge staff set by hand (which
 * replaces the breakdown), or free. The extras have lines of their own.
 */
export function orderDeliveryLine(o: {
  delivery_area?: unknown
  fee_area?: unknown
  fee_upstairs?: unknown
  fee_assembly?: unknown
  fee_removal?: unknown
  delivery_total?: unknown
}): { label: string; amount: number } {
  const n = (v: unknown) => Number(v ?? 0) || 0
  const area = n(o.fee_area)
  const extras = n(o.fee_upstairs) + n(o.fee_assembly) + n(o.fee_removal)
  const unexplained = Math.max(0, Math.round((n(o.delivery_total) - extras - area) * 100) / 100)
  if (area > 0) return { label: `Delivery to ${typeof o.delivery_area === 'string' && o.delivery_area ? o.delivery_area : 'your area'}`, amount: area + unexplained }
  return { label: 'Delivery', amount: unexplained }
}
