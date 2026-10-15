import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FEATURES } from '@/config/features'
import { ADDRESS_LOOKUP_CONFIGURED } from '@/lib/address/lookup'
import { getCheckoutSettings } from '@/lib/product/load'
import { CheckoutForm } from './CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

// Per request, so the delivery days offered are always today's.
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  if (!FEATURES.checkout) notFound()
  const s = await getCheckoutSettings()
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-6 lg:px-6 lg:pt-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-[34px] leading-[1.08] lg:text-[52px]">Checkout</h1>
        <p className="text-[16px] leading-relaxed text-slate lg:text-[17px]">
          No card and nothing to pay today. You pay the driver once it&rsquo;s in your room.
        </p>
      </header>
      <CheckoutForm
        settings={s.delivery}
        windowLabel={s.windowLabel}
        earliestDate={s.earliestDate}
        latestDate={s.latestDate}
        lookupAvailable={ADDRESS_LOOKUP_CONFIGURED}
      />
    </div>
  )
}
