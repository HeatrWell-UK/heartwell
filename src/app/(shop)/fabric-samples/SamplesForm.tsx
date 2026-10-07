'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import { CheckCircleIcon, CheckIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, TextArea, TextInput } from '@/components/ui/Field'
import { SAMPLES } from '@/config/samples'
import { visitIds } from '@/lib/basket/store'
import { cn } from '@/lib/cn'
import { requestSamples, type SampleField } from './actions'

export interface SampleCollection {
  slug: string
  name: string
  fabrics: { id: string; code: string; name: string; hex: string | null; image: string | null }[]
}

export function SamplesForm({ collections, limit, initialIds }: { collections: SampleCollection[]; limit: number; initialIds: string[] }) {
  const id = useId()
  const [chosen, setChosen] = useState<string[]>(initialIds.slice(0, limit))
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [postcode, setPostcode] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<{ message: string; field?: SampleField } | null>(null)
  const [done, setDone] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  const all = collections.flatMap((c) => c.fabrics.map((f) => ({ ...f, collection: c.name })))
  const full = chosen.length >= limit
  const toggle = (fabricId: string) => setChosen((list) => (list.includes(fabricId) ? list.filter((x) => x !== fabricId) : list.length >= limit ? list : [...list, fabricId]))
  const fieldError = (f: SampleField) => (error?.field === f ? error.message : undefined)

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-gold-cream-tint p-5 lg:p-8">
        <CheckCircleIcon aria-hidden="true" size={44} weight="fill" className="text-velvet" />
        <h2 className="text-[26px] leading-tight">Thank you, {name.trim().split(/\s+/)[0]}</h2>
        <p className="text-[17px] leading-relaxed">
          We’ll ring or WhatsApp you on <strong className="font-semibold">{phone}</strong> to arrange the {SAMPLES.fee}, then post your {chosen.length}{' '}
          {chosen.length === 1 ? 'sample' : 'samples'}. We’ve emailed you the details too.
        </p>
        <p className="text-[15px] text-slate">When you order your sofa, we take the {SAMPLES.fee} off the price.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-[15px] font-semibold">
          <Link href="/sofas?mto=yes">See the sofas made to order</Link>
          <Link href="/fabrics">Back to the fabrics</Link>
        </div>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (chosen.length === 0) {
      setError({ message: 'Choose at least one fabric.', field: 'fabrics' })
      return
    }
    setSending(true)
    setError(null)
    const ids = visitIds()
    const r = await requestSamples({ name, phone, email, postcode, address, materialIds: chosen, website, visit: ids ? { visitorId: ids.visitorId, sessionId: ids.sessionId } : null }).catch(() => ({
      ok: false as const,
      message: 'We couldn’t reach the server. Please try again.',
      field: undefined,
    }))
    setSending(false)
    if (r.ok) {
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError(r)
    requestAnimationFrame(() => errorRef.current?.focus())
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-10">
      <section aria-labelledby={`${id}-choose`} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`${id}-choose`} className="text-2xl">
            1. Choose up to {limit} fabrics
          </h2>
          <p aria-live="polite" className={cn('text-[15px] font-semibold', full ? 'text-velvet' : 'text-slate')}>
            {chosen.length} of {limit} chosen
          </p>
        </div>
        {fieldError('fabrics') && (
          <p className="flex items-center gap-2 text-[15px] font-semibold text-error">
            <WarningCircleIcon aria-hidden="true" size={20} /> {fieldError('fabrics')}
          </p>
        )}
        {collections.map((c) => (
          <fieldset key={c.slug} className="flex flex-col gap-3">
            <legend className="mb-3 font-display text-lg font-bold">{c.name}</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-2 gap-y-3">
              {c.fabrics.map((f) => {
                const on = chosen.includes(f.id)
                const off = full && !on
                return (
                  <label
                    key={f.id}
                    className={cn(
                      'relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1.5 text-center has-[:focus-visible]:shadow-[var(--shadow-focus)]',
                      on && 'bg-gold-tint',
                      off && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={on} disabled={off} onChange={() => toggle(f.id)} />
                    <span className={cn('pinked relative block aspect-square w-full max-w-20 overflow-hidden', on && 'ring-2 ring-velvet ring-offset-2')} style={{ backgroundColor: f.hex ?? '#F5F1EF' }}>
                      {f.image && <Image src={f.image} alt="" width={80} height={80} className="size-full object-cover" />}
                      {on && (
                        <span className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-velvet text-white">
                          <CheckIcon aria-hidden="true" size={14} weight="bold" />
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] font-semibold leading-tight">{f.name}</span>
                    <span className="text-[12px] text-slate">{f.code}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </section>

      <section aria-labelledby={`${id}-send`} className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-stone p-4 lg:p-6">
        <h2 id={`${id}-send`} className="text-2xl">
          2. Where to send them
        </h2>
        {chosen.length > 0 && (
          <ul aria-label="Your fabrics" className="flex flex-wrap gap-2">
            {chosen.map((fabricId) => {
              const f = all.find((x) => x.id === fabricId)
              if (!f) return null
              return (
                <li key={fabricId} className="flex items-center gap-1 rounded-full bg-white py-1 pl-3 pr-1 text-sm ring-1 ring-line">
                  {f.collection} {f.name}
                  <button type="button" onClick={() => toggle(fabricId)} aria-label={`Remove ${f.collection} ${f.name}`} className="flex size-8 items-center justify-center rounded-full hover:bg-stone">
                    <XIcon aria-hidden="true" size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Your name" error={fieldError('name')}>
            {(f) => <TextInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
          <Field label="Mobile number" help="We’ll ring or WhatsApp you about the £5." error={fieldError('phone')}>
            {(f) => (
              <TextInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" />
            )}
          </Field>
          <Field label="Email" error={fieldError('email')}>
            {(f) => (
              <TextInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" />
            )}
          </Field>
          <Field label="Postcode" error={fieldError('postcode')}>
            {(f) => (
              <TextInput
                id={f.id}
                aria-describedby={f.describedBy}
                aria-invalid={f.invalid || undefined}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                autoComplete="postal-code"
                autoCapitalize="characters"
                className="uppercase"
              />
            )}
          </Field>
          <Field label="Address" help="House number, street and town." error={fieldError('address')} className="lg:col-span-2">
            {(f) => (
              <TextArea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" rows={2} />
            )}
          </Field>
        </div>
        <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        {error && !error.field && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="flex items-start gap-2 rounded-[var(--radius-field)] bg-white p-3 text-[15px] font-semibold text-error ring-1 ring-error">
            <WarningCircleIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
            {error.message}
          </div>
        )}
        {error?.field && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="sr-only">
            {error.message}
          </div>
        )}

        <Button type="submit" block disabled={sending}>
          {sending ? 'Sending…' : chosen.length > 0 ? `Request ${chosen.length} ${chosen.length === 1 ? 'sample' : 'samples'}` : 'Request samples'}
        </Button>
        <p className="text-sm text-slate">
          Nothing to pay now. We’ll ring or WhatsApp you to arrange the {SAMPLES.fee} for the set before we post anything, and we take it off your sofa if you buy.
        </p>
      </section>
    </form>
  )
}
