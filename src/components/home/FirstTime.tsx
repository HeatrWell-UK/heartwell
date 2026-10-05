import { CheckIcon } from '@phosphor-icons/react/ssr'
import { PROMISES } from '@/config/promises'
import { CONTACT } from '@/config/contact'

/** "Buying from us for the first time?": the reassurances, each one true of how the shop works. */
export function FirstTime() {
  const points = [
    { title: 'Nothing to pay until delivery', body: 'No deposit and no card details. You pay once you’ve seen it.' },
    { title: 'A real person confirms every order', body: 'We ring to check the details with you and book your delivery day.' },
    { title: `${PROMISES.guarantee.label} on the frame and springs`, body: 'If something structural goes wrong, send us a photo and we’ll put it right.' },
    { title: PROMISES.returns.label, body: 'On ready-made pieces. Made-to-order sofas are built for you, so they’re exempt. Faults are always covered.' },
    ...(CONTACT.whatsAppNumber ? [{ title: 'Answers on WhatsApp', body: 'Ask about sizes, fabrics or delivery and the team will reply.' }] : []),
  ]
  return (
    <section aria-labelledby="first-time" className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-12 lg:px-6 lg:pt-20">
      <h2 id="first-time" className="text-[28px] leading-tight lg:text-[34px]">
        Buying from us for the first time?
      </h2>
      <ul className="grid gap-4 lg:grid-cols-2 lg:gap-x-12">
        {points.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-tint text-velvet">
              <CheckIcon size={16} weight="bold" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] font-semibold leading-snug">{p.title}</span>
              <span className="text-[15px] text-slate">{p.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
