'use client'

// Beside the product editor's "Was price": how the deal will look on the
// shop, and whether the price history backs it up. UK consumer law treats a
// was-price the piece never really sold at as misleading, so this warns (it
// doesn't block: the history only starts on 16 October 2026).

import { dealFor, dealLabel } from '@/lib/catalogue/deal'
import { daysAtOrAbove, WAS_PRICE_DAYS, type PricePoint } from '@/lib/admin/catalogue-form'
import { formatPrice, ukDate } from '@/lib/format'

const PRICE = /^\d{1,7}(\.\d{1,2})?$/

export function WasPriceCheck({ price, wasPrice, log, isNew }: { price: string; wasPrice: string; log: PricePoint[]; isNew: boolean }) {
  const now = Number(price.trim())
  const was = Number(wasPrice.trim())
  const deal = PRICE.test(price.trim()) && PRICE.test(wasPrice.trim()) ? dealFor(now, was) : null
  // Price changes only (a was-price change alone isn't a new selling price), newest first.
  const changes = [...log].sort((a, b) => b.at.localeCompare(a.at)).filter((p, i, all) => all[i + 1]?.price !== p.price)

  return (
    <div className="flex flex-col gap-2 text-sm">
      {deal ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2 text-zinc-700">
            <span>Shows as</span>
            <span className="font-semibold text-zinc-900">{formatPrice(now)}</span>
            <s className="text-zinc-500">{formatPrice(deal.was)}</s>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{dealLabel(deal, formatPrice)}</span>
          </p>
          <HistoryVerdict days={isNew ? 0 : daysAtOrAbove(log, was)} was={was} isNew={isNew} />
        </>
      ) : null}
      {!isNew && changes.length > 0 && (
        <p className="text-xs text-zinc-500">
          Price history:{' '}
          {changes
            .slice(0, 4)
            .map((p) => `${formatPrice(p.price)} from ${ukDate(new Date(p.at), { weekday: false, year: true })}`)
            .join(' · ')}
          .
        </p>
      )}
    </div>
  )
}

function HistoryVerdict({ days, was, isNew }: { days: number; was: number; isNew: boolean }) {
  if (days >= WAS_PRICE_DAYS) {
    return (
      <p className="rounded-lg bg-emerald-50 p-2.5 text-emerald-900 ring-1 ring-emerald-200">
        Sold at {formatPrice(was)} or more for {days} days in a row, so the was price is backed up.
      </p>
    )
  }
  return (
    <p role="alert" className="rounded-lg bg-amber-50 p-2.5 text-amber-950 ring-1 ring-amber-300">
      {isNew ? 'A new piece hasn’t sold at any earlier price yet. ' : `The price history shows ${days} ${days === 1 ? 'day' : 'days'} at ${formatPrice(was)} or more. `}
      Only use a was price the piece really sold at here, for at least {WAS_PRICE_DAYS} days in a row, recently. UK consumer law treats any other was price as
      misleading.
    </p>
  )
}
