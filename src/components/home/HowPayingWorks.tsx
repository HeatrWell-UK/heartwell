import { ArrowsCounterClockwiseIcon, PhoneCallIcon, ShieldCheckIcon } from '@phosphor-icons/react/ssr'
import { PROMISES } from '@/config/promises'

const steps = [
  { title: 'Order in two minutes', body: 'No card and no account. There’s nothing to pay today.' },
  { title: 'Confirm with one tap', body: 'We send your order by WhatsApp and email. Tap Confirm and we ring to book your delivery day.' },
  {
    title: 'Pay when it’s in your room',
    body: `Usually ${PROMISES.delivery.timingShort} later. Look it over, then pay the driver in cash or by bank transfer.`,
  },
]

const alsoTrue = [
  { Icon: ShieldCheckIcon, text: `${PROMISES.guarantee.label} on the frame and springs` },
  { Icon: ArrowsCounterClockwiseIcon, text: `${PROMISES.returns.label} on ready-made pieces` },
  { Icon: PhoneCallIcon, text: 'A real person checks every order with you' },
]

/**
 * How paying works, on a stone panel with an inset line like the wall
 * panelling in the photos. A true sequence, so it's numbered; the numbers
 * carry the gold, joined by a gold line (down on phones, across on desktops).
 */
export function HowPayingWorks() {
  return (
    <section aria-labelledby="paying" className="mx-auto max-w-[1200px] px-4 pt-12 lg:px-6 lg:pt-20">
      <div className="hw-panel px-5 py-9 lg:px-14 lg:py-14">
        <h2 id="paying" className="max-w-[22ch] text-[30px] leading-[1.12] lg:text-[42px]">
          Nothing to pay until it&rsquo;s in your room
        </h2>

        <ol className="mt-8 grid gap-7 lg:mt-12 lg:grid-cols-3 lg:gap-10">
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 lg:flex-col lg:gap-5">
              {/* The thread to the next number: down on phones, across on desktops, stopping short of each. */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hw-thread absolute -bottom-5 left-5 top-12 w-px lg:bottom-auto lg:left-12 lg:top-5 lg:h-px lg:w-[calc(100%_-_1rem)]"
                />
              )}
              <span
                aria-hidden="true"
                className="bg-gold-sheen relative flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[20px] text-wine"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1 pt-1.5 lg:pt-0">
                <span className="text-[18px] font-semibold leading-snug">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </span>
                <span className="text-[15px] leading-relaxed text-slate lg:text-base">{s.body}</span>
              </div>
            </li>
          ))}
        </ol>

        <ul className="mt-9 grid gap-3 border-t border-line pt-6 lg:mt-12 lg:grid-cols-3 lg:gap-10">
          {alsoTrue.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-[15px] text-body-dark">
              <Icon aria-hidden="true" size={22} className="shrink-0 text-velvet" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
