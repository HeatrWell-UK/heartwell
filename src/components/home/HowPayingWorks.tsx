import { ArrowsCounterClockwiseIcon, PhoneCallIcon, ShieldCheckIcon } from '@phosphor-icons/react/ssr'
import { PROMISES } from '@/config/promises'

const alsoTrue = [
  { Icon: ShieldCheckIcon, text: `${PROMISES.guarantee.label} on the frame and springs` },
  { Icon: ArrowsCounterClockwiseIcon, text: `${PROMISES.returns.label} on ready-made pieces` },
  { Icon: PhoneCallIcon, text: 'A real person checks every order with you' },
]

/**
 * How paying works, as what you pay and when: £0 today, £0 when you confirm,
 * and only then, in your room, the driver. The last step carries this week's
 * real delivery dates. A true sequence on a gold thread (down on phones,
 * across on desktops) that draws itself as the steps scroll by (globals.css,
 * .hw-thread-draw).
 */
export function HowPayingWorks({ windowLabel }: { windowLabel: string | null }) {
  const steps = [
    { when: 'Today', pay: '£0', paid: 'to pay when you order', title: 'Order in two minutes', body: 'Choose your sofa and fabric. No card, no deposit and no account.' },
    {
      when: 'Straight after',
      pay: '£0',
      paid: 'to pay when you confirm',
      title: 'Confirm with one tap',
      body: 'We send your order by WhatsApp and email. Tap Confirm and we ring you to book the delivery day.',
    },
    {
      when: windowLabel ? `Usually ${windowLabel}` : `Usually in ${PROMISES.delivery.timingShort}`,
      pay: 'On delivery',
      paid: 'to the driver, in cash or by bank transfer',
      title: 'It’s in your room',
      body: 'Look it over before you pay. If anything’s wrong, show the driver and we’ll put it right.',
    },
  ]

  return (
    <section aria-labelledby="paying" className="mx-auto max-w-[1200px] px-4 pt-14 lg:px-6 lg:pt-24">
      <h2 id="paying" className="max-w-[18ch] text-[32px] leading-[1.1] lg:max-w-none lg:text-[46px]">
        Nothing to pay until it&rsquo;s in your room
      </h2>

      <ol className="mt-9 grid lg:mt-14 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative grid grid-cols-[16px_1fr] gap-x-5 pb-8 last:pb-0 lg:grid-cols-1 lg:gap-y-6 lg:pb-0 lg:pr-10">
            {/* The thread to the next milestone: down on phones, across on desktops. */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="hw-thread hw-thread-draw absolute bottom-0 left-[7px] top-7 w-0.5 lg:left-8 lg:right-2 lg:top-[7px] lg:h-0.5 lg:w-auto"
              />
            )}
            <span aria-hidden="true" className="bg-gold-sheen relative mt-1 size-4 rounded-full shadow-[0_0_0_5px_white,0_3px_8px_1px_rgb(74_13_23/0.35)] lg:mt-0" />
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-velvet">
                <span className="sr-only">Step {i + 1}, </span>
                {s.when}
              </span>
              <span className="mt-2 font-display text-[44px] leading-none text-velvet lg:mt-3 lg:text-[60px]">{s.pay}</span>
              <span className="mt-1.5 text-[14px] text-slate">{s.paid}</span>
              <span className="mt-3.5 text-[18px] font-semibold leading-snug lg:mt-5 lg:text-[19px]">{s.title}</span>
              <span className="mt-1 max-w-[34ch] text-[15px] leading-relaxed text-slate lg:text-base">{s.body}</span>
            </div>
          </li>
        ))}
      </ol>

      <ul className="mt-11 grid gap-3 border-t border-line pt-6 lg:mt-14 lg:grid-cols-3 lg:gap-10">
        {alsoTrue.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-[15px] text-body-dark">
            <Icon aria-hidden="true" size={22} className="shrink-0 text-velvet" />
            {text}
          </li>
        ))}
      </ul>
    </section>
  )
}
