'use client'

import Image from 'next/image'
import { ButtonLink, Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { FEATURES } from '@/config/features'
import { formatPrice } from '@/lib/format'
import { useBasket } from '@/lib/basket/store'
import { PayRows } from '@/components/checkout/PayRows'
import { MinimumNote } from '@/components/checkout/MinimumNote'
import { useBasketOffer } from '@/components/offer/useBasketOffer'
import type { ShopOffers } from '@/lib/offers/welcome'

export interface AddedItem {
  title: string
  option: string
  image: string | null
  price: number
}

/** "Added to your basket": what was added and what's to pay (nothing today). */
export function AddedSheet({ item, offers, onClose }: { item: AddedItem | null; offers: ShopOffers; onClose: () => void }) {
  const basket = useBasket()
  const offer = useBasketOffer(basket.lines, offers)
  return (
    <Sheet open={item !== null} onClose={onClose} title="Added to your basket">
      {item && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="relative size-[84px] shrink-0 overflow-hidden rounded-2xl bg-stone">
              {item.image && <Image src={item.image} alt="" width={84} height={84} className="size-full object-cover" />}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold leading-snug">{item.title}</span>
              <span className="text-sm text-slate">{item.option}</span>
              <span className="pt-0.5 font-display text-lg">{formatPrice(item.price)}</span>
            </div>
          </div>

          <dl className="flex flex-col gap-1.5 border-y border-line-soft py-3 text-[15px]">
            {basket.count > 1 && (
              <div className="flex justify-between">
                <dt>Items in your basket</dt>
                <dd>{basket.count}</dd>
              </div>
            )}
            {offer.amount > 0 && (
              <div className="flex justify-between">
                <dt>{offer.kind === 'welcome' ? 'Welcome offer' : 'Your offer'}</dt>
                <dd>−{formatPrice(offer.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="font-semibold text-velvet">Free for most postcodes</dd>
            </div>
            <PayRows total={basket.subtotal - offer.amount} className="mt-1" />
          </dl>

          {offer.short > 0 ? (
            <>
              <MinimumNote short={offer.short} minimum={offers.minOrder} subtotal={basket.subtotal} />
              <Button block onClick={onClose}>
                Keep shopping
              </Button>
              <ButtonLink href="/basket" variant="secondary" block>
                View basket
              </ButtonLink>
            </>
          ) : (
            <>
              {FEATURES.checkout ? (
                <ButtonLink href="/checkout" block>
                  Go to checkout
                </ButtonLink>
              ) : (
                <ButtonLink href="/basket" block>
                  View basket
                </ButtonLink>
              )}
              <Button variant="secondary" block onClick={onClose}>
                Keep shopping
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
