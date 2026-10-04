'use server'

import { BasketIdentities, freshBasketViews, SavedIdentities, savedCards } from '@/lib/basket/refresh'

/** Fresh details for the basket on this device. Read-only: nothing is stored on the server. */
export async function refreshBasket(input: unknown) {
  const parsed = BasketIdentities.safeParse(input)
  if (!parsed.success) return { ok: false as const }
  return { ok: true as const, views: await freshBasketViews(parsed.data) }
}

/** Cards for the saved list on this device. */
export async function loadSaved(input: unknown) {
  const parsed = SavedIdentities.safeParse(input)
  if (!parsed.success) return { ok: false as const }
  return { ok: true as const, cards: await savedCards(parsed.data) }
}
