// Display prices, worked out the same way the database does (base price +
// colourway adjustment + fabric collection surcharge).
//
// The database is the authority: at checkout place_order prices every line
// itself and refuses an order whose total doesn't match the one the customer
// saw, so a slip here could only stop an order, never change what anyone pays.

export function unitPrice(base: number, adjustment = 0, surcharge = 0): number {
  return Math.round((base + adjustment + surcharge) * 100) / 100
}

/** The lowest price a product can be bought at: its cheapest live colourway. */
export function fromPrice(base: number, adjustments: number[]): number {
  return unitPrice(base, adjustments.length ? Math.min(...adjustments) : 0)
}
