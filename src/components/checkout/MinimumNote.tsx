import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

/**
 * A basket short of the minimum order: how much more it needs, and a thin
 * bar of how far there. The pieces' prices count, before offers and delivery
 * (as the database checks it).
 */
export function MinimumNote({ short, minimum, subtotal, className }: { short: number; minimum: number; subtotal: number; className?: string }) {
  const done = minimum > 0 ? Math.min(100, Math.max(0, (subtotal / minimum) * 100)) : 100
  return (
    <div role="status" className={cn('flex flex-col gap-2.5 rounded-[var(--radius-field)] bg-stone px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--color-line)]', className)}>
      <p className="flex flex-col gap-0.5 text-[15px] leading-snug">
        <strong className="font-semibold text-ink">
          Orders start at {formatPrice(minimum)}. Add {formatPrice(short)} more to check out.
        </strong>
        <span className="text-sm text-slate">It&rsquo;s the pieces&rsquo; prices that count, before any offer or delivery charge.</span>
      </p>
      <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full bg-velvet" style={{ width: `${done}%` }} />
      </span>
    </div>
  )
}
