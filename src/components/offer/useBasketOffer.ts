'use client'

import { basketSubtotal, type BasketLine } from '@/lib/basket/model'
import { orderOffer } from '@/lib/offers/event'
import { shortOfMinimum, type ShopOffers } from '@/lib/offers/welcome'
import { useEvent } from './EventOffer'
import { useOfferEnds } from './OfferStrip'
import { useWelcome } from './WelcomeOffer'

/**
 * The offer on a basket as the database will work it out (one offer per
 * piece: during the Christmas and New Year event, £50 off each made-to-order
 * sofa plus the better of the welcome or ad offer on the other pieces;
 * otherwise the welcome offer or an ad visitor's, whichever takes more off),
 * and how far it is from the minimum order. For display; checkout's figures
 * count.
 */
export function useBasketOffer(lines: BasketLine[], offers: ShopOffers) {
  const adEnds = useOfferEnds()
  const welcome = useWelcome(offers.welcome.enabled)
  const event = useEvent(offers.event)
  const subtotal = basketSubtotal(lines)
  const outcome = orderOffer(
    lines.map((l) => ({ madeToOrder: l.view.madeToOrder, tier: l.view.offerTier ?? null, unitPrice: l.view.unitPrice, quantity: l.quantity })),
    {
      event: event !== null,
      eventAmount: offers.event.mtoAmount,
      ad: adEnds !== null,
      amounts: offers.amounts,
      welcome: welcome.kind === 'live',
      welcomeAmount: offers.welcome.amount,
    },
  )
  return { welcome, event, ...outcome, short: shortOfMinimum(subtotal, offers.minOrder) }
}
