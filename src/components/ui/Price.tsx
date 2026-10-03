import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Prices are set in Besley Bold, the way the design shows them. */
export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('font-display font-bold tabular-nums text-ink', className)}>{formatPrice(amount)}</span>
}
