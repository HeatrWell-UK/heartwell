import { CalendarBlankIcon, MoneyIcon, TruckIcon } from '@phosphor-icons/react/ssr'
import { PROMISES } from '@/config/promises'

const tiles = [
  { Icon: TruckIcon, title: PROMISES.delivery.label, sub: PROMISES.delivery.sub },
  { Icon: MoneyIcon, title: PROMISES.payment.label, sub: PROMISES.payment.sub },
  { Icon: CalendarBlankIcon, title: PROMISES.delivery.timingShort, sub: PROMISES.delivery.timingSub },
]

/** The three promises a first-time buyer needs, straight from config/promises. */
export function PromiseTiles() {
  return (
    <section aria-label="Our promises" className="mx-auto max-w-[1200px] px-4 pt-6 lg:px-6">
      <ul className="grid grid-cols-3 gap-2 lg:gap-4">
        {tiles.map(({ Icon, title, sub }) => (
          <li key={title} className="flex flex-col items-center gap-1.5 rounded-2xl bg-stone px-1.5 py-3.5 text-center">
            <Icon aria-hidden="true" size={26} className="text-velvet" />
            <span className="text-sm font-semibold leading-tight text-ink">{title}</span>
            <span className="text-[13px] leading-tight text-slate">{sub}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
