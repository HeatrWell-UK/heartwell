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
      <h1 className="text-[32px] leading-tight lg:text-[40px]">Checkout</h1>
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
