'use client'

import { useId, useState } from 'react'
import { checkFit, type FitOutcome } from '@/lib/product/helpers'

/** "Will it fit through your door?": the narrowest door against the piece's depth or height. */
export function WillItFit({
  depth,
  height,
  inSections,
  askHref,
}: {
  depth: number | null
  height: number | null
  /** Corners, U-shapes and sets arrive in pieces. */
  inSections: boolean
  askHref: string
}) {
  const id = useId()
  const [value, setValue] = useState('')
  const [outcome, setOutcome] = useState<FitOutcome | null>(null)

  const sideName = (needed: number) => (needed === depth ? 'deep' : 'high')
  const pieces = inSections ? 'Each section is' : 'It’s'

  return (
    <form
      className="flex flex-col gap-2.5 rounded-[var(--radius-card)] bg-stone p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setOutcome(checkFit(Number(value), { depth_cm: depth, height_cm: height }))
      }}
    >
      <label htmlFor={id} className="text-base font-semibold">
        Will it fit through your door?
      </label>
      <span id={`${id}-help`} className="text-sm text-slate">
        Measure the narrowest door or hallway on the way in.
      </span>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={40}
            max={250}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Width"
            aria-describedby={`${id}-help`}
            className="h-[52px] w-full rounded-[var(--radius-field)] border-[1.5px] border-field bg-white pl-3.5 pr-11 text-ink placeholder:text-slate/70 focus:border-velvet focus:shadow-[0_0_0_4px_var(--color-gold-tint)] focus:outline-none"
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate">
            cm
          </span>
        </div>
        <button type="submit" className="h-[52px] shrink-0 rounded-[var(--radius-field)] border-[1.5px] border-velvet px-[18px] font-semibold text-velvet">
          Check
        </button>
      </div>
      <div role="status" aria-live="polite" className="text-[15px] leading-snug">
        {outcome?.kind === 'invalid' && <p className="font-semibold text-error">Enter the door width in centimetres, for example 76.</p>}
        {outcome?.kind === 'unknown' && (
          <p>
            We’re confirming this piece’s depth. <a href={askHref}>Ask us</a> and we’ll check it for you.
          </p>
        )}
        {outcome?.kind === 'fits' && (
          <p>
            <strong className="font-semibold">It should fit.</strong> {pieces} {outcome.needed} cm {sideName(outcome.needed)}, and your door is{' '}
            {outcome.door} cm wide. Sofas go through a door on their side, so that’s the measurement that matters.
          </p>
        )}
        {outcome?.kind === 'tight' && (
          <p>
            <strong className="font-semibold">It’s close.</strong> {pieces} {outcome.needed} cm {sideName(outcome.needed)}, with only{' '}
            {outcome.door - outcome.needed} cm to spare. Check door handles and frames, or <a href={askHref}>ask us</a> before you order.
          </p>
        )}
        {outcome?.kind === 'no' && (
          <p>
            <strong className="font-semibold">Probably not through that door.</strong> {pieces} {outcome.needed} cm{' '}
            {sideName(outcome.needed)}. Try a wider way in, such as a patio door, or <a href={askHref}>ask us</a> and we’ll help you work it
            out.
          </p>
        )}
      </div>
    </form>
  )
}
