import { ArrowCounterClockwiseIcon, MoneyIcon, ScissorsIcon, ShieldCheckIcon } from '@phosphor-icons/react/ssr'
import { PROMISES } from '@/config/promises'

/** Payment, guarantee and returns, in the shop's own words (src/config/promises.ts). */
export function PromiseRows({ madeToOrder }: { madeToOrder: boolean }) {
  const rows = [
    { icon: MoneyIcon, strong: `${PROMISES.payment.label}.`, text: 'Cash or bank transfer, once it’s in your room.' },
    { icon: ShieldCheckIcon, strong: PROMISES.guarantee.label, text: 'on the frame and springs.' },
    madeToOrder
      ? { icon: ScissorsIcon, strong: 'Made to order for you,', text: 'so the 14-day change-of-mind return doesn’t apply. Faults are always covered.' }
      : { icon: ArrowCounterClockwiseIcon, strong: `${PROMISES.returns.label}.`, text: 'Faults are always covered.' },
  ]
  return (
    <ul className="flex flex-col pt-5">
      {rows.map(({ icon: Icon, strong, text }) => (
        <li key={strong} className="flex items-center gap-3.5 border-b border-line-soft py-3 last:border-b-0">
          <Icon aria-hidden="true" size={26} className="shrink-0 text-velvet" />
          <span className="text-[15px]">
            <strong className="font-semibold">{strong}</strong> {text}
          </span>
        </li>
      ))}
    </ul>
  )
}
