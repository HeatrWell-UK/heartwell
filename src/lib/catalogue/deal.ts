// Was-prices (owner, 22 October 2026): a piece on a deal shows the price it
// was, struck through, beside today's price and the percentage off. Set in
// the admin (products.was_price), only ever a price the piece really sold at.

export interface Deal {
  /** The earlier price, as shown (with the same colourway or fabric difference as today's). */
  was: number
  save: number
  /** Rounded down, so it never claims more than the real saving. */
  percent: number
}

/** The deal on a price, or null when there's no was-price above it. */
export function dealFor(price: number, wasPrice: number | null | undefined): Deal | null {
  if (wasPrice === null || wasPrice === undefined || !(wasPrice > price) || !(price >= 0)) return null
  const save = Math.round((wasPrice - price) * 100) / 100
  return { was: wasPrice, save, percent: Math.floor((save / wasPrice) * 100) }
}

/** "20% off", or "£15 off" when the saving is under 1%. */
export function dealLabel(deal: Deal, formatPrice: (n: number) => string): string {
  return deal.percent >= 1 ? `${deal.percent}% off` : `${formatPrice(deal.save)} off`
}
