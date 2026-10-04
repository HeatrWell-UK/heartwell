'use client'

import { useId, useState, useSyncExternalStore } from 'react'
import { CheckIcon, InfoIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { recallPostcode, rememberPostcode } from '@/lib/basket/store'
import { postcodeOutcome, type PostcodeOutcome } from '@/lib/product/helpers'

/**
 * "Check delivery to your postcode": answered instantly on the phone (the same
 * rules the database applies at checkout). The postcode is remembered on this
 * device for the next product and for checkout.
 */
const noSubscription = () => () => {}

export function PostcodeCheck({ windowLabel }: { windowLabel: string }) {
  const id = useId()
  // The postcode checked last time on this device, read once storage is available.
  const remembered = useSyncExternalStore(noSubscription, recallPostcode, () => '')
  const [typed, setTyped] = useState<string | null>(null)
  const [checked, setChecked] = useState<PostcodeOutcome | null>(null)

  const value = typed ?? remembered
  const outcome: PostcodeOutcome = checked ?? (remembered ? postcodeOutcome(remembered) : { kind: 'empty' })

  const check = () => {
    const result = postcodeOutcome(value)
    setChecked(result)
    if (result.kind !== 'empty' && result.kind !== 'invalid') {
      setTyped(result.postcode)
      rememberPostcode(result.postcode)
    }
  }

  const ask = (postcode: string) =>
    whatsAppHref(`Hi Heartwell, could I have a delivery quote for ${postcode}?`) ??
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Delivery quote for ${postcode}`)}`

  return (
    <section aria-labelledby={`${id}-label`} className="mt-6 flex flex-col gap-3 rounded-[var(--radius-card)] bg-stone px-4 py-[18px]">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <label id={`${id}-label`} htmlFor={id} className="text-base font-semibold">
          Check delivery to your postcode
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            value={value}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="postal-code"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="e.g. LS6 2AB"
            aria-invalid={outcome.kind === 'invalid' || undefined}
            aria-describedby={outcome.kind === 'invalid' ? `${id}-error` : undefined}
            className="h-[52px] min-w-0 flex-1 rounded-[var(--radius-field)] border-[1.5px] border-field bg-white px-3.5 uppercase text-ink placeholder:normal-case placeholder:text-slate/70 focus:border-velvet focus:shadow-[0_0_0_4px_var(--color-gold-tint)] focus:outline-none aria-[invalid=true]:border-2 aria-[invalid=true]:border-error"
          />
          <button type="submit" className="h-[52px] shrink-0 rounded-[var(--radius-field)] bg-velvet-sheen px-5 font-semibold text-white">
            Check
          </button>
        </div>
      </form>

      <div role="status" aria-live="polite">
        {outcome.kind === 'invalid' && (
          <p id={`${id}-error`} className="flex items-start gap-2 text-[15px] font-semibold text-error">
            <WarningCircleIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
            Please enter a full UK postcode, like LS6 2AB.
          </p>
        )}
        {outcome.kind === 'free' && (
          <Result tone="ok">
            <strong className="font-semibold">Free delivery to {outcome.area}.</strong> Most orders arrive {windowLabel}.
          </Result>
        )}
        {outcome.kind === 'depends' && (
          <Result tone="info">
            Parts of {outcome.area} are on islands, so delivery depends on the address. Pick your address at checkout and we’ll tell you
            straight away.
          </Result>
        )}
        {outcome.kind === 'quote' && (
          <Result tone="info">
            We deliver to {outcome.place ?? outcome.area} by arrangement, not through the online checkout.{' '}
            <a href={ask(outcome.postcode)} className="font-semibold">
              Ask us for a delivery quote
            </a>
            .
          </Result>
        )}
      </div>

      <p className="text-sm leading-snug text-slate">Upstairs delivery, assembly and taking your old sofa away can be added at checkout.</p>
    </section>
  )
}

function Result({ tone, children }: { tone: 'ok' | 'info'; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-[var(--radius-field)] bg-white p-3 text-[15px] leading-snug">
      <span
        aria-hidden="true"
        className={
          tone === 'ok'
            ? 'mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-velvet text-white'
            : 'mt-px flex size-6 shrink-0 items-center justify-center text-velvet'
        }
      >
        {tone === 'ok' ? <CheckIcon size={14} weight="bold" /> : <InfoIcon size={22} />}
      </span>
      <span>{children}</span>
    </p>
  )
}
