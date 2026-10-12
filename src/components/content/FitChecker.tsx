'use client'

import { useId, useState } from 'react'
import { checkFit, type FitOutcome } from '@/lib/product/helpers'

const inputClass =
  'h-[52px] w-full rounded-[var(--radius-field)] border-[1.5px] border-field bg-white pl-3.5 pr-11 text-ink placeholder:text-slate/70 focus:border-velvet focus:shadow-[0_0_0_4px_var(--color-gold-tint)] focus:outline-none'

function CmField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <span id={`${id}-hint`} className="text-sm text-slate">
        {hint}
      </span>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={20}
          max={400}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-hint`}
          className={inputClass}
        />
        <span aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate">
          cm
        </span>
      </div>
    </div>
  )
}

/** The product page's door check, for any sofa: its depth and height against the narrowest way in. */
export function FitChecker() {
  const id = useId()
  const [depth, setDepth] = useState('')
  const [height, setHeight] = useState('')
  const [door, setDoor] = useState('')
  const [outcome, setOutcome] = useState<FitOutcome | null>(null)
  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  return (
    <form
      className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-stone p-5"
      onSubmit={(e) => {
        e.preventDefault()
        setOutcome(checkFit(Number(door), { depth_cm: num(depth), height_cm: num(height) }))
      }}
    >
      <h2 className="mt-0 text-[22px]">Check a sofa against your door</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <CmField id={`${id}-depth`} label="Sofa depth" hint="On its page, under Measurements." value={depth} onChange={setDepth} />
        <CmField id={`${id}-height`} label="Sofa height" hint="Including the back." value={height} onChange={setHeight} />
        <CmField id={`${id}-door`} label="Narrowest way in" hint="Door, hallway or turn." value={door} onChange={setDoor} />
      </div>
      <button type="submit" className="h-[52px] self-start rounded-[var(--radius-field)] border-[1.5px] border-velvet px-6 font-semibold text-velvet">
        Check
      </button>
      <div role="status" aria-live="polite" className="text-[16px] leading-snug">
        {outcome?.kind === 'invalid' && <p className="font-semibold text-error">Enter the narrowest width in centimetres, for example 76.</p>}
        {outcome?.kind === 'unknown' && <p className="font-semibold text-error">Enter the sofa’s depth or height too.</p>}
        {outcome?.kind === 'fits' && (
          <p>
            <strong className="font-semibold">It should fit.</strong> The sofa goes through on its side, needing {outcome.needed} cm, and you have{' '}
            {outcome.door} cm.
          </p>
        )}
        {outcome?.kind === 'tight' && (
          <p>
            <strong className="font-semibold">It’s close:</strong> only {outcome.door - outcome.needed} cm to spare. Check handles, frames and the turn,
            or ask us before you order.
          </p>
        )}
        {outcome?.kind === 'no' && (
          <p>
            <strong className="font-semibold">Probably not that way in.</strong> It needs {outcome.needed} cm. Try a wider way in, such as a patio door, or
            ask us: corner and U-shaped sofas come in sections.
          </p>
        )}
      </div>
    </form>
  )
}
