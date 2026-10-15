import { formatPrice } from '@/lib/format'
import type { CustomerOrder } from '@/lib/checkout/read'
import { PayRows } from './PayRows'

/** An order's lines and totals, as the customer sees them after ordering. */
export function OrderLines({ order }: { order: Pick<CustomerOrder, 'items' | 'itemsSubtotal' | 'discountAmount' | 'extras' | 'totalAmount'> }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line-soft">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3 py-2.5 text-[15px]">
            <span className="flex flex-col">
              <span className="font-semibold">
                {i.quantity > 1 ? `${i.quantity} × ` : ''}
                {i.title}
              </span>
              {i.option && <span className="text-sm text-slate">{i.option}</span>}
            </span>
            <span className="shrink-0 font-display text-[17px]">{formatPrice(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[15px]">
        <div className="flex justify-between">
          <dt>Items</dt>
          <dd>{formatPrice(order.itemsSubtotal)}</dd>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between">
            <dt>Offer</dt>
            <dd>−{formatPrice(order.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Delivery to UK Mainland</dt>
          <dd className="font-semibold text-velvet">Free</dd>
        </div>
        {order.extras.map((e) => (
          <div key={e.label} className="flex justify-between">
            <dt>{e.label}</dt>
            <dd>{formatPrice(e.amount)}</dd>
          </div>
        ))}
        <PayRows total={order.totalAmount} className="mt-1" />
      </dl>
    </div>
  )
}
