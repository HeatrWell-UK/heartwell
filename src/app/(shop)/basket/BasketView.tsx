'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MinusIcon, PlusIcon, TrashIcon, InfoIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { FEATURES } from '@/config/features'
import { formatPrice } from '@/lib/format'
import { useBasket } from '@/lib/basket/store'
import { useHydrated } from '@/lib/basket/use-hydrated'
import { MAX_QUANTITY } from '@/lib/basket/model'
import { productHref } from '@/lib/product/helpers'
import { refreshBasket } from './actions'

export function BasketView() {
  const basket = useBasket()
  const hydrated = useHydrated()
  const [removed, setRemoved] = useState(0)
  const refreshed = useRef(false)

  // Once per visit: bring titles, photos and prices up to date, and drop anything withdrawn.
  useEffect(() => {
    if (!hydrated || refreshed.current || basket.lines.length === 0) return
    refreshed.current = true
    const identities = basket.lines.map(({ id, variantId, materialId }) => ({ id, variantId, materialId }))
    refreshBasket(identities)
      .then((res) => {
        if (!res.ok) return
        setRemoved(Object.values(res.views).filter((v) => v === null).length)
        basket.refresh(res.views)
      })
      .catch(() => {
        // Offline or the server is busy: the stored details still show, and checkout re-prices everything.
      })
  }, [hydrated, basket])

  if (!hydrated) return <div className="min-h-[50vh]" aria-busy="true" />

  if (basket.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        {removed > 0 && <RemovedNotice count={removed} />}
        <p className="text-[17px] text-slate">Your basket is empty.</p>
        <ButtonLink href="/sofas">Shop sofas</ButtonLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-4">
        {removed > 0 && <RemovedNotice count={removed} />}
        <ul className="flex flex-col divide-y divide-line-soft border-y border-line-soft">
          {basket.lines.map((line) => (
            <li key={line.id} className="flex gap-3 py-4">
              <Link href={productHref(line.view.slug, line.view.sku)} className="relative size-[88px] shrink-0 overflow-hidden rounded-2xl bg-stone">
                {line.view.image && <Image src={line.view.image} alt="" width={88} height={88} className="size-full object-cover" />}
                <span className="sr-only">{line.view.title}</span>
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={productHref(line.view.slug, line.view.sku)} className="font-semibold leading-snug text-ink no-underline hover:underline">
                  {line.view.title}
                </Link>
                <span className="text-sm text-slate">{line.view.option}</span>
                {line.view.madeToOrder && (
                  <span>
                    <Badge>Made to order</Badge>
                  </span>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center rounded-full border border-line">
                    <button
                      type="button"
                      aria-label={`One fewer ${line.view.title}`}
                      disabled={line.quantity <= 1}
                      onClick={() => basket.setQuantity(line.id, line.quantity - 1)}
                      className="flex size-11 items-center justify-center rounded-full text-velvet disabled:text-field"
                    >
                      <MinusIcon aria-hidden="true" size={18} weight="bold" />
                    </button>
                    <span className="min-w-6 text-center font-semibold tabular-nums" aria-live="polite">
                      <span className="sr-only">Quantity </span>
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`One more ${line.view.title}`}
                      disabled={line.quantity >= MAX_QUANTITY}
                      onClick={() => basket.setQuantity(line.id, line.quantity + 1)}
                      className="flex size-11 items-center justify-center rounded-full text-velvet disabled:text-field"
                    >
                      <PlusIcon aria-hidden="true" size={18} weight="bold" />
                    </button>
                  </div>
                  <Price amount={line.view.unitPrice * line.quantity} className="text-lg" />
                </div>
                <button
                  type="button"
                  onClick={() => basket.remove(line.id)}
                  className="flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-velvet"
                >
                  <TrashIcon aria-hidden="true" size={18} />
                  Remove<span className="sr-only"> {line.view.title}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/sofas" className="self-start text-[15px] font-semibold">
          Keep shopping
        </Link>
      </div>

      <section aria-labelledby="summary" className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-stone p-5 lg:sticky lg:top-6">
        <h2 id="summary" className="text-[22px]">
          Summary
        </h2>
        <dl className="flex flex-col gap-2 text-[15px]">
          <div className="flex justify-between">
            <dt>
              {basket.count} {basket.count === 1 ? 'item' : 'items'}
            </dt>
            <dd>{formatPrice(basket.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery to UK Mainland</dt>
            <dd className="font-semibold text-velvet">Free</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <dt>To pay today</dt>
            <dd className="font-semibold">£0</dd>
          </div>
          <div className="flex justify-between text-[17px] font-semibold">
            <dt>To pay on delivery</dt>
            <dd>{formatPrice(basket.subtotal)}</dd>
          </div>
        </dl>
        <p className="text-sm leading-snug text-slate">
          Upstairs delivery, assembly and taking your old sofa away can be added at checkout. You pay the driver in cash or by bank transfer
          once it’s in your room.
        </p>
        {FEATURES.checkout ? (
          <ButtonLink href="/checkout" block>
            Go to checkout
          </ButtonLink>
        ) : (
          <>
            <Button block disabled>
              Go to checkout
            </Button>
            <p className="text-sm text-slate">Checkout is switched on in the next build phase.</p>
          </>
        )}
      </section>
    </div>
  )
}

function RemovedNotice({ count }: { count: number }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-[var(--radius-field)] bg-gold-cream-tint p-3 text-[15px]">
      <InfoIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-velvet" />
      {count === 1 ? 'One item is no longer available, so we took it out of your basket.' : `${count} items are no longer available, so we took them out of your basket.`}
    </p>
  )
}

