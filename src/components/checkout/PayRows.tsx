import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

/**
 * The two lines every summary ends with, the same everywhere from the product
 * page to the order page: nothing today, and what the driver is paid. Goes
 * inside a <dl>.
 */
export function PayRows({ total, className }: { total: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 border-t border-line pt-3', className)}>
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <dt>To pay today</dt>
        <dd className="font-display text-[19px] leading-none text-velvet">£0</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[17px] font-semibold">To pay on delivery</dt>
        <dd className="font-display text-[26px] leading-none">{formatPrice(total)}</dd>
      </div>
    </div>
  )
}
