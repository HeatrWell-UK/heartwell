import type { Metadata } from 'next'
import Link from 'next/link'
import { ProductGrid } from '@/components/catalogue/ProductTile'
import { SaleHeading } from '@/components/offer/SaleHeading'
import { getListing } from '@/lib/catalogue/listing'
import { getOfferSettings } from '@/lib/offers/server'
import { createPublicClient } from '@/lib/supabase/public'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { PROMISES } from '@/config/promises'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Christmas and New Year sofa event: £50 off made-to-order sofas',
  description:
    '£50 off each made-to-order sofa from 1 December to 31 January, no code needed. Made in the UK in your fabric, paid for in full on delivery. Free delivery to most of mainland Britain.',
  alternates: { canonical: '/sale' },
}

/** Pieces the shop keeps out of every offer (offer_product_tiers EXCLUDED). Anyone may read the tiers. */
async function excludedSlugs(): Promise<Set<string>> {
  if (!SUPABASE_CONFIGURED) return new Set()
  const { data } = await createPublicClient().from('offer_product_tiers').select('tier, product:products!inner(slug)').eq('tier', 'EXCLUDED')
  return new Set((data ?? []).map((r) => (Array.isArray(r.product) ? r.product[0]?.slug : (r.product as { slug?: string } | null)?.slug)).filter((s): s is string => Boolean(s)))
}

// The event's page (Run 2, owner 24 November 2026): every piece the event
// covers, at today's real price, with the £50 coming off in the basket. It
// never shows a was-price or a percentage, and it says plainly when the event
// hasn't started or has ended (the heading is worked out in the browser in UK
// time, so it switches by itself).
export default async function SalePage() {
  const [listing, offers, excluded] = await Promise.all([getListing(), getOfferSettings(), excludedSlugs()])
  const eligible = listing.filter((p) => p.madeToOrder && !excluded.has(p.slug)).sort((a, b) => a.price - b.price)
  return (
    <div className="pb-16 lg:pb-24">
      <header className="bg-wine text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 lg:px-6 lg:py-14">
          <SaleHeading event={offers.event} count={eligible.length} />
          <p className="max-w-[44rem] text-[15px] leading-relaxed text-on-wine">
            {PROMISES.payment.short}. Free delivery to most of mainland Britain; Devon, Cornwall and the
            north of Scotland pay a delivery charge, shown before you order.{' '}
            <Link href="/delivery-and-returns" className="font-semibold text-on-wine-link underline hover:text-white">
              Delivery areas
            </Link>
          </p>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-8 lg:px-6">
        <p className="text-[15px] text-slate">
          Prices shown are today’s prices. While the event is on, £{Math.round(offers.event.mtoAmount)} comes off each of these sofas in your basket, one offer per
          piece. Recliners and other imported pieces keep their own offers.
        </p>
        {eligible.length > 0 ? <ProductGrid products={eligible} eagerCount={4} /> : <p>No made-to-order sofas are on sale just now.</p>}
      </div>
    </div>
  )
}
