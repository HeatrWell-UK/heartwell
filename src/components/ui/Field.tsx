import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  /** Shown under the label, before the input. */
  help?: string
  /** Shown under the input, in words, with a red border on the input. */
  error?: string
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
  className?: string
}

/** Label above, help text under the label, error in words under the field. */
export function Field({ label, help, error, children, className }: FieldProps) {
  const id = useId()
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-base font-semibold text-ink">
        {label}
      </label>
      {help && (
        <span id={helpId} className="text-sm text-slate">
          {help}
        </span>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <span id={errorId} className="text-[15px] font-semibold text-error">
          {error}
        </span>
      )}
    </div>
  )
}

const control =
  'min-h-[54px] w-full rounded-[var(--radius-field)] border-[1.5px] border-field bg-white px-3.5 text-[17px] text-ink placeholder:text-slate/70 focus:border-velvet focus:shadow-[0_0_0_4px_var(--color-gold-tint)] focus:outline-none aria-[invalid=true]:border-2 aria-[invalid=true]:border-error'

export function TextInput({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...rest} />
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={cn(control, 'appearance-none pr-10', className)} {...rest}>
      {children}
    </select>
  )
}

export function TextArea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-28 py-3', className)} {...rest} />
}
