import Link from 'next/link'
import { ProductGrid } from '@/components/catalogue/ProductTile'
import { RangeCard } from '@/components/catalogue/RangeCard'
import { SaleHeading } from '@/components/offer/SaleHeading'
import { PROMISES } from '@/config/promises'
import { rangesFrom } from '@/lib/catalogue/listing'
import { formatPrice } from '@/lib/format'
import { eventLastDay, offerWords } from '@/lib/offers/event'
import { getSeasonProducts } from '@/lib/offers/eligible'
import { getOfferSettings } from '@/lib/offers/server'

/**
 * The season's own pages (Run 3): /christmas, /new-year and /sale. The code
 * and the terms near the top, then the real ranges (or every piece on /sale)
 * at today's real price, with the £50 coming off in the basket. Never a
 * was-price or a percentage.
 */
export async function SeasonLanding({ variant }: { variant: 'christmas' | 'new-year' | 'sale' }) {
  const [products, offers] = await Promise.all([getSeasonProducts(), getOfferSettings()])
  const event = offers.event
  const on = event.enabled && event.mtoAmount > 0
  const code = variant === 'christmas' ? 'CHRISTMAS' : 'NEWYEAR'
  const ranges = rangesFrom(products)
  const title = variant === 'christmas' ? 'Christmas sofa event' : variant === 'new-year' ? 'New Year sofa event' : undefined
  return (
    <div className="pb-16 lg:pb-24">
      <header className="bg-wine text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 lg:px-6 lg:py-14">
          <SaleHeading event={event} count={products.length} title={title} />
          {on && (
            <dl className="grid max-w-[44rem] gap-x-6 gap-y-2 text-[15px] leading-snug text-on-wine sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold text-white">Code</dt>
              <dd>
                <strong className="tracking-wider text-gold-light">{variant === 'sale' ? 'CHRISTMAS or NEWYEAR' : code}</strong>, applied for you automatically. Codes
                don’t add more: one offer per piece.
              </dd>
              <dt className="font-semibold text-white">Offer</dt>
              <dd>
                {offerWords(event.mtoAmount)}, made to order or ready-made. Footstools aren’t included. For 14 days from your first visit, until {eventLastDay(event)} at
                the latest.
              </dd>
              <dt className="font-semibold text-white">Order</dt>
              <dd>
                Minimum order {formatPrice(offers.minOrder)}. {PROMISES.payment.short}. Free delivery to most of mainland Britain; Devon, Cornwall and the north of
                Scotland pay a delivery charge, shown before you order.{' '}
                <Link href="/delivery-and-returns" className="font-semibold text-on-wine-link underline hover:text-white">
                  Delivery areas
                </Link>
              </dd>
            </dl>
          )}
        </div>
      </header>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pt-8 lg:px-6">
        {on && (
          <p className="text-[15px] text-slate">
            Prices shown are today’s prices. While your offer is live, {formatPrice(event.mtoAmount)} comes off each sofa and chair in your basket.
          </p>
        )}
        {variant === 'sale' ? (
          products.length > 0 ? (
            <ProductGrid products={products} eagerCount={4} />
          ) : (
            <p>Nothing is on sale just now.</p>
          )
        ) : (
          <>
            <h2 className="text-[28px] leading-tight lg:text-[36px]">Every range is in the offer</h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {ranges.map((r, i) => (
                <li key={r.slug}>
                  <RangeCard range={r} eager={i < 3} sizes="(min-width: 1200px) 384px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw" />
                </li>
              ))}
            </ul>
            <p className="text-[16px]">
              <Link href="/sale" className="font-semibold">
                See all {products.length} sofas and chairs in the offer
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
