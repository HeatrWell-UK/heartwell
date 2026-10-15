import { CheckIcon } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/cn'
import { ukDate } from '@/lib/format'
import type { JourneyStep } from '@/lib/checkout/journey'

/**
 * Where an order has got to, as five steps joined by the gold thread: done
 * ones ticked in velvet (with the day, where known), the next one in gold with
 * what happens there, the rest outlined. Used after ordering, on the confirm
 * page and on Track my order.
 */
export function OrderJourney({ steps, label = 'Where your order is' }: { steps: JourneyStep[]; label?: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.key} aria-current={s.state === 'current' ? 'step' : undefined} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn('absolute bottom-0 left-4 top-9 w-px', s.state === 'done' ? 'bg-gold' : 'bg-line')}
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'relative flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[16px]',
              s.state === 'done' && 'bg-velvet text-white',
              s.state === 'current' && 'bg-gold-sheen text-wine',
              s.state === 'upcoming' && 'border-[1.5px] border-field bg-white text-slate',
            )}
          >
            {s.state === 'done' ? <CheckIcon size={15} weight="bold" /> : i + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 pt-1">
            <span className={cn('text-[16px] leading-snug', s.state === 'upcoming' ? 'text-slate' : 'font-semibold text-ink')}>
              {s.label}
              {s.state === 'done' && s.at && <span className="font-normal text-slate">, {ukDate(new Date(s.at), { weekday: false })}</span>}
              <span className="sr-only">{s.state === 'done' ? ' (done)' : s.state === 'current' ? ' (next)' : ' (to come)'}</span>
            </span>
            {s.hint && <span className="text-[15px] leading-snug text-body-dark">{s.hint}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
