'use client'

import Image from 'next/image'
import { ButtonLink, Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { FEATURES } from '@/config/features'
import { formatPrice } from '@/lib/format'
import { useBasket } from '@/lib/basket/store'

export interface AddedItem {
  title: string
  option: string
  image: string | null
  price: number
}

/** "Added to your basket": what was added and what's to pay (nothing today). */
export function AddedSheet({ item, onClose }: { item: AddedItem | null; onClose: () => void }) {
  const basket = useBasket()
  return (
    <Sheet open={item !== null} onClose={onClose} title="Added to your basket">
      {item && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="relative size-[84px] shrink-0 overflow-hidden rounded-2xl bg-stone">
              {item.image && <Image src={item.image} alt="" fill sizes="84px" className="object-cover" />}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold leading-snug">{item.title}</span>
              <span className="text-sm text-slate">{item.option}</span>
              <span className="pt-0.5 font-display text-lg font-bold">{formatPrice(item.price)}</span>
            </div>
          </div>

          <dl className="flex flex-col gap-1.5 border-y border-line-soft py-3 text-[15px]">
            {basket.count > 1 && (
              <div className="flex justify-between">
                <dt>Items in your basket</dt>
                <dd>{basket.count}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery to UK Mainland</dt>
              <dd className="font-semibold text-velvet">Free</dd>
            </div>
            <div className="flex justify-between">
              <dt>To pay today</dt>
              <dd className="font-semibold">£0</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>To pay on delivery</dt>
              <dd>{formatPrice(basket.subtotal)}</dd>
            </div>
          </dl>

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
        </div>
      )}
    </Sheet>
  )
}
