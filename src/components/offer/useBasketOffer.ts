'use client'

import { basketCount, basketSubtotal, type BasketLine } from '@/lib/basket/model'
import { basketOfferAmount } from '@/lib/offers/paid'
import { bestOffer, shortOfMinimum, welcomeOff, type ShopOffers } from '@/lib/offers/welcome'
import { useOfferEnds } from './OfferStrip'
import { useWelcome } from './WelcomeOffer'

/**
 * The offer on a basket as the database will work it out (one offer: the
 * welcome offer or an ad visitor's, whichever takes more off), and how far it
 * is from the minimum order. For display; checkout's figures count.
 */
export function useBasketOffer(lines: BasketLine[], offers: ShopOffers) {
  const adEnds = useOfferEnds()
  const welcome = useWelcome(offers.welcome.enabled)
  const subtotal = basketSubtotal(lines)
  const ad = adEnds ? basketOfferAmount(lines.map((l) => ({ tier: l.view.offerTier ?? null, lineTotal: l.view.unitPrice * l.quantity })), offers.amounts) : 0
  const off = welcome.kind === 'live' ? welcomeOff(basketCount(lines), subtotal, offers.welcome.amount) : 0
  return { welcome, ...bestOffer(off, ad), short: shortOfMinimum(subtotal, offers.minOrder) }
}
