const steps = [
  { title: 'Order online in two minutes', body: 'No card, no account and nothing to pay today.' },
  {
    title: 'Confirm with one tap',
    body: 'We send your order by WhatsApp and email. Tap Confirm and we ring to book your delivery day.',
  },
  { title: 'Pay when it’s in your room', body: 'Look it over first, then pay the driver in cash or by bank transfer.' },
]

/** A true sequence, so it is numbered. The numbers carry the gold. */
export function HowOrderingWorks() {
  return (
    <section className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-10 lg:px-6 lg:pt-16">
      <h2 className="text-[28px] leading-tight lg:text-[34px]">How ordering works</h2>
      <ol className="grid gap-5 lg:grid-cols-3 lg:gap-8">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span
              aria-hidden="true"
              className="bg-gold-sheen flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[19px] font-bold text-wine"
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-1 pt-1.5">
              <span className="text-[17px] font-semibold leading-snug">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </span>
              <span className="text-[15px] text-slate">{s.body}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
