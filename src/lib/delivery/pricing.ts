// What the delivery extras cost.
//
// The TypeScript copy of public.quote_delivery, for showing prices as the
// customer chooses. The figures come from the shop_settings row (never from
// constants here), and the database recalculates them when the order is
// placed. tests/delivery-parity.test.ts holds both to the same answers.

export interface DeliverySettings {
  upstairs_first_floor: number
  upstairs_per_extra_floor: number
  max_floor: number
  assembly_fee: number
  removal_per_seat: number
  removal_min_seats: number
  removal_max_seats: number
  removal_default_seats: number
}

export interface DeliveryChoices {
  /** 0 = ground floor, 1 = first floor and so on. */
  floor: number
  /** A lift makes any floor the first-floor rate. */
  hasLift: boolean
  assembly: boolean
  removal: boolean
  /** Seats being taken away; only counted when removal is on. */
  removalSeats: number | null
}

export interface DeliveryQuote {
  floor: number
  hasLift: boolean
  upstairs: number
  assembly: number
  removalSeats: number | null
  removal: number
  total: number
}

export const NO_EXTRAS: DeliveryChoices = { floor: 0, hasLift: false, assembly: false, removal: false, removalSeats: null }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function quoteDelivery(choices: DeliveryChoices, s: DeliverySettings): DeliveryQuote {
  const floor = clamp(Number.isFinite(choices.floor) ? Math.floor(choices.floor) : 0, 0, s.max_floor)
  const upstairs =
    floor === 0 ? 0 : choices.hasLift ? s.upstairs_first_floor : s.upstairs_first_floor + (floor - 1) * s.upstairs_per_extra_floor
  const assembly = choices.assembly ? s.assembly_fee : 0
  const removalSeats = choices.removal
    ? clamp(
        choices.removalSeats === null || !Number.isFinite(choices.removalSeats)
          ? s.removal_default_seats
          : Math.floor(choices.removalSeats),
        s.removal_min_seats,
        s.removal_max_seats,
      )
    : null
  const removal = (removalSeats ?? 0) * s.removal_per_seat
  return { floor, hasLift: floor > 0 && choices.hasLift, upstairs, assembly, removalSeats, removal, total: upstairs + assembly + removal }
}

export function floorName(floor: number): string {
  if (floor <= 0) return 'Ground floor'
  const suffix = floor % 100 >= 11 && floor % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][floor % 10] ?? 'th')
  return `${floor}${suffix} floor`
}

export interface DeliveryLine {
  key: 'upstairs' | 'assembly' | 'removal'
  label: string
  detail?: string
  amount: number
}

/** The chargeable extras as lines for a basket, checkout or email. Base delivery is free. */
export function deliveryLines(quote: DeliveryQuote, s: DeliverySettings): DeliveryLine[] {
  const lines: DeliveryLine[] = []
  if (quote.upstairs > 0) {
    lines.push({
      key: 'upstairs',
      label: 'Carrying upstairs',
      detail: quote.hasLift ? `${floorName(quote.floor)}, with a lift` : floorName(quote.floor),
      amount: quote.upstairs,
    })
  }
  if (quote.assembly > 0) lines.push({ key: 'assembly', label: 'Assembly in your room', amount: quote.assembly })
  if (quote.removalSeats !== null) {
    lines.push({
      key: 'removal',
      label: 'Taking your old sofa away',
      detail: `${quote.removalSeats} ${quote.removalSeats === 1 ? 'seat' : 'seats'} at £${s.removal_per_seat} each`,
      amount: quote.removal,
    })
  }
  return lines
}
