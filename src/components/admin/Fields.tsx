'use client'

// Form pieces shared by the admin's editors, in the admin's own style
// (zinc, 16px inputs so phones don't zoom, 44px touch targets).

import { useId, type ReactNode } from 'react'
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

export const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[16px] text-zinc-900 focus:border-zinc-900 focus:outline-none aria-[invalid=true]:border-red-600 disabled:bg-zinc-100 disabled:text-zinc-500'
export const labelClass = 'text-sm font-semibold text-zinc-800'
export const buttonClass = 'flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold'
export const primaryButton = cn(buttonClass, 'bg-zinc-900 text-white disabled:opacity-60')
export const secondaryButton = cn(buttonClass, 'bg-white text-zinc-800 ring-1 ring-zinc-200 hover:ring-zinc-300')
export const dangerButton = cn(buttonClass, 'bg-red-700 text-white disabled:opacity-60')

export function Card({ title, intro, children, id }: { title: string; intro?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id ? `${id}-title` : undefined} id={id} className="scroll-mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 id={id ? `${id}-title` : undefined} className="text-lg font-bold text-zinc-900">
        {title}
      </h2>
      {intro && <p className="mt-1 text-sm text-zinc-600">{intro}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  )
}

interface BaseProps {
  label: string
  hint?: ReactNode
  invalid?: boolean
  className?: string
}

export function TextField({
  label,
  hint,
  invalid,
  className,
  value,
  onChange,
  prefix,
  suffix,
  ...rest
}: BaseProps & { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix'>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        {prefix && <span className="shrink-0 text-sm text-zinc-500">{prefix}</span>}
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass} {...rest} />
        {suffix && <span className="shrink-0 text-sm text-zinc-500">{suffix}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}

export function TextArea({ label, hint, invalid, className, value, onChange, rows = 4, maxLength }: BaseProps & { value: string; onChange: (v: string) => void; rows?: number; maxLength?: number }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={hint || maxLength ? `${id}-hint` : undefined}
        className={cn(inputClass, 'py-2 leading-relaxed')}
      />
      {(hint || maxLength) && (
        <p id={`${id}-hint`} className="flex justify-between gap-3 text-xs text-zinc-500">
          <span>{hint}</span>
          {maxLength && (
            <span className={cn('tabular-nums', value.length > maxLength * 0.9 && 'text-amber-800')}>
              {value.length}/{maxLength}
            </span>
          )}
        </p>
      )}
    </div>
  )
}

export function SelectField({
  label,
  hint,
  invalid,
  className,
  value,
  onChange,
  options,
  disabled,
}: BaseProps & { value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[]; disabled?: boolean }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 accent-zinc-900"
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold text-zinc-800">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-zinc-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}

export type Outcome = { ok: boolean; message: string; problems?: { message: string }[] | string[] } | null

/** The result of the last save: a short confirmation, or what to fix. */
export function OutcomeNote({ outcome }: { outcome: Outcome }) {
  if (!outcome) return null
  const problems = (outcome.problems ?? []).map((p) => (typeof p === 'string' ? p : p.message))
  if (outcome.ok)
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
        <CheckCircleIcon aria-hidden="true" size={18} className="mt-px shrink-0" />
        {outcome.message}
      </p>
    )
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-900 ring-1 ring-red-200">
      <WarningCircleIcon aria-hidden="true" size={18} className="mt-px shrink-0" />
      {problems.length > 1 ? (
        <div>
          <p className="font-semibold">Please fix these first:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.slice(0, 8).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-semibold">{outcome.message}</p>
      )}
    </div>
  )
}

/** The save button, kept in reach at the bottom of long forms (above the phone tab bar). */
export function SaveBar({ saving, label, outcome, children }: { saving: boolean; label: string; outcome: Outcome; children?: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
      <OutcomeNote outcome={outcome} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className={cn(primaryButton, 'min-h-12 flex-1 sm:flex-none sm:px-8')}>
          {saving ? 'Saving…' : label}
        </button>
        {children}
      </div>
    </div>
  )
}
