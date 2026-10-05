import Link from 'next/link'
import { Accordion } from '@/components/ui/Accordion'
import { PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import type { DeliveryInfo } from '@/lib/product/types'

/** "Questions people ask": short answers from the single sources (promises and shop settings). */
export function HomeFaq({ delivery, fabricCount }: { delivery: DeliveryInfo | null; fabricCount: number }) {
  const items = [
    {
      title: 'How do I pay?',
      open: true,
      content: <p>You pay the driver when your sofa arrives, in cash or by bank transfer. Nothing is taken when you order, and we never ask for card details.</p>,
    },
    {
      title: 'When will my sofa arrive?',
      content: (
        <p>
          {PROMISES.delivery.timingLong}
          {delivery ? ` Order today and most arrive ${delivery.windowLabel}.` : ''} We ring to book the day with you.
        </p>
      ),
    },
    {
      title: 'Do you deliver to my area?',
      content: (
        <p>
          {PROMISES.delivery.long} Northern Ireland, the islands and the Isle of Wight are delivered by arrangement: check your postcode on any
          sofa’s page and we’ll tell you straight away.
        </p>
      ),
    },
    {
      title: 'Can I have it in a different fabric?',
      content: (
        <p>
          Yes, on made-to-order sofas: choose from {fabricCount > 0 ? `our ${fabricCount}` : 'our'} fabrics on the sofa’s page.{' '}
          <Link href="/fabrics">See the fabrics</Link>.
        </p>
      ),
    },
    ...(delivery
      ? [
          {
            title: 'Can you take it upstairs or take my old sofa away?',
            content: (
              <p>
                Yes. Add it at checkout: upstairs delivery {formatPrice(delivery.upstairsFirstFloor)} for the first floor, assembly{' '}
                {formatPrice(delivery.assemblyFee)}, and taking your old sofa away {formatPrice(delivery.removalPerSeat)} a seat.
              </p>
            ),
          },
        ]
      : []),
  ]
  return (
    <section aria-labelledby="faq" className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-12 lg:px-6 lg:pt-20">
      <h2 id="faq" className="text-[28px] leading-tight lg:text-[34px]">
        Questions people ask
      </h2>
      <div className="max-w-[46rem]">
        <Accordion items={items} name="home-faq" />
      </div>
    </section>
  )
}
