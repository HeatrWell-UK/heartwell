'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { BasketIcon, MinusIcon, PlusIcon, TrashIcon, InfoIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { FEATURES } from '@/config/features'
import { formatPrice } from '@/lib/format'
import { useBasket } from '@/lib/basket/store'
import { useHydrated } from '@/lib/basket/use-hydrated'
import { MAX_QUANTITY } from '@/lib/basket/model'
import { productHref } from '@/lib/product/helpers'
import { basketOfferAmount, type TierAmounts } from '@/lib/offers/paid'
import { OfferStrip, useOfferEnds } from '@/components/offer/OfferStrip'
import { PayRows } from '@/components/checkout/PayRows'
import { refreshBasket } from './actions'

const NEXT = [
  'Place your order. No card, no account and nothing to pay.',
  'Confirm it with one tap, and we ring to book your delivery day.',
  'Pay the driver once it’s in your room.',
]

export function BasketView({ offerAmounts, offerCode }: { offerAmounts: TierAmounts; offerCode: string | null }) {
  const basket = useBasket()
  const hydrated = useHydrated()
  const offerEnds = useOfferEnds()
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

  // A screen-tall space while the basket is read from the device, and for an
  // empty basket, so the footer never jumps into view (no layout shift).
  if (!hydrated) return <div className="min-h-svh" aria-busy="true" />

  if (basket.lines.length === 0) {
    return (
      <div className="flex min-h-svh flex-col items-start gap-5">
        {removed > 0 && <RemovedNotice count={removed} />}
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-gold-tint text-velvet">
          <BasketIcon size={28} />
        </span>
        <p className="max-w-[32rem] text-[17px] leading-relaxed text-slate">
          Your basket is empty. Whatever you add stays here on this phone, and there&rsquo;s nothing to pay until it&rsquo;s delivered.
        </p>
        <ButtonLink href="/sofas">Shop sofas</ButtonLink>
      </div>
    )
  }

  // Shown as the database works it out; checkout's figure is the one that counts.
  const offer = offerEnds ? basketOfferAmount(basket.lines.map((l) => ({ tier: l.view.offerTier ?? null, lineTotal: l.view.unitPrice * l.quantity })), offerAmounts) : 0
  const toPay = basket.subtotal - offer

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
                  <Price amount={line.view.unitPrice * line.quantity} className="text-[20px]" />
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

      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <section aria-labelledby="summary" className="hw-panel flex flex-col gap-4 px-5 py-6 lg:px-7 lg:py-7">
          <h2 id="summary" className="text-[26px] leading-tight">
            Summary
          </h2>
          <OfferStrip amount={offer} code={offerCode} />
          <dl className="flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between">
              <dt>
                {basket.count} {basket.count === 1 ? 'item' : 'items'}
              </dt>
              <dd>{formatPrice(basket.subtotal)}</dd>
            </div>
            {offer > 0 && (
              <div className="flex justify-between">
                <dt>Your offer</dt>
                <dd>−{formatPrice(offer)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery to UK Mainland</dt>
              <dd className="font-semibold text-velvet">Free</dd>
            </div>
            <PayRows total={toPay} className="mt-1" />
          </dl>
          <p className="text-sm leading-snug text-slate">
            Cash or bank transfer to the driver, once it&rsquo;s in your room. Upstairs delivery, assembly and taking your old sofa away can be
            added at checkout.
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

        {/* What happens after the button, so nobody wonders whether they're about to pay. */}
        <section aria-labelledby="next-steps" className="flex flex-col gap-3 px-1">
          <h2 id="next-steps" className="text-[20px] leading-tight">
            What happens next
          </h2>
          <ol className="flex flex-col gap-3">
            {NEXT.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[15px] leading-snug">
                <span aria-hidden="true" className="bg-gold-sheen flex size-7 shrink-0 items-center justify-center rounded-full font-display text-[14px] text-wine">
                  {i + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
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

