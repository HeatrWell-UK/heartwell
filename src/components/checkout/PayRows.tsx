import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

/**
 * The line every summary ends with, the same everywhere from the product page
 * to the order page: the full amount, paid to the driver. Goes inside a <dl>.
 * (Until 15 November 2026 a "To pay today £0" row stood above it; the owner
 * found customers read it as the first step of a payment plan.)
 */
export function PayRows({ total, className }: { total: number; className?: string }) {
  return (
    // One row straight inside the parent <dl> (a <dl> may hold <div>s of <dt> and <dd>, but not a <div> of <div>s).
    <div className={cn('flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3', className)}>
      <dt className="text-[17px] font-semibold">To pay on delivery, in full</dt>
      <dd className="font-display text-[26px] leading-none">{formatPrice(total)}</dd>
      <dd className="basis-full text-[13px] leading-snug text-slate">One payment to the driver, in cash or by bank transfer. No deposit, no finance.</dd>
    </div>
  )
}
