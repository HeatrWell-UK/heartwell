import { Accordion } from '@/components/ui/Accordion'
import { CARE } from '@/config/care'
import { PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import type { DeliveryInfo, ProductPageData } from '@/lib/product/types'

/** About (once written in Phase 17C), specifications, delivery and returns, care. */
export function ProductDetails({ product: p, delivery }: { product: ProductPageData; delivery: DeliveryInfo }) {
  const noun = p.typeName.toLowerCase()
  const items = [
    ...(p.description
      ? [
          {
            title: `About this ${noun}`,
            open: true,
            content: (
              <>
                {p.description.split(/\n{2,}/).map((para) => (
                  <p key={para.slice(0, 40)}>{para}</p>
                ))}
                {p.highlights.length > 0 && (
                  <ul className="list-disc pl-5">
                    {p.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      title: 'Specifications',
      open: !p.description,
      content: (
        <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-2">
          {p.specs.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-slate">{row.label}</dt>
              <dd className="text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: 'Delivery and returns',
      content: (
        <>
          <p>
            {PROMISES.delivery.long} {PROMISES.delivery.timingLong}
          </p>
          <p>
            Extras you can add at checkout: upstairs delivery {formatPrice(delivery.upstairsFirstFloor)} for the first floor (or any floor with a
            lift) and {formatPrice(delivery.upstairsPerExtraFloor)} for each floor above it; assembly {formatPrice(delivery.assemblyFee)}; taking
            your old sofa away {formatPrice(delivery.removalPerSeat)} a seat.
          </p>
          <p>{PROMISES.payment.long}</p>
          <p>{p.madeToOrder ? 'Made to order for you, so it can’t be returned for a change of mind. Faults are always covered.' : PROMISES.returns.long}</p>
          <p>{PROMISES.guarantee.long}</p>
        </>
      ),
    },
    {
      title: 'Care',
      content: (
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {CARE[p.coverKind].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ),
    },
  ]
  return <Accordion items={items} />
}
