'use client'

import { useId, useRef, useState } from 'react'
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/leads/topics'
import { visitIds } from '@/lib/basket/store'
import { sendContactMessage, type ContactField } from './actions'

export function ContactForm() {
  const id = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState<ContactTopic>('before')
  const [orderReference, setOrderReference] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<{ message: string; field?: ContactField } | null>(null)
  const [sent, setSent] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const fieldError = (f: ContactField) => (error?.field === f ? error.message : undefined)
  const aboutAnOrder = topic === 'order' || topic === 'delivery' || topic === 'after'

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-gold-cream-tint p-5 lg:p-6">
        <CheckCircleIcon aria-hidden="true" size={40} weight="fill" className="text-velvet" />
        <h2 className="text-[24px] leading-tight">Thanks, {name.trim().split(/\s+/)[0]}</h2>
        <p className="text-[17px] leading-relaxed">We’ve got your message and will reply to {email} as soon as we can. We’ve sent you a copy.</p>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setSending(true)
        setError(null)
        const r = await sendContactMessage({ name, email, phone, topic, orderReference: aboutAnOrder ? orderReference : '', message, website, visitorId: visitIds()?.visitorId ?? null }).catch(() => ({
          ok: false as const,
          message: 'We couldn’t reach the server. Please try again.',
          field: undefined,
        }))
        setSending(false)
        if (r.ok) return setSent(true)
        setError(r)
        requestAnimationFrame(() => errorRef.current?.focus())
      }}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Your name" error={fieldError('name')}>
          {(f) => <TextInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
        </Field>
        <Field label="Email" help="So we can reply." error={fieldError('email')}>
          {(f) => (
            <TextInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" />
          )}
        </Field>
        <Field label="Phone (optional)" error={fieldError('phone')}>
          {(f) => (
            <TextInput id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" />
          )}
        </Field>
        <Field label="What’s it about?">
          {(f) => (
            <Select id={f.id} value={topic} onChange={(e) => setTopic(e.target.value as ContactTopic)}>
              {Object.entries(CONTACT_TOPICS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {aboutAnOrder && (
          <Field label="Order number (optional)" help="It starts HW-, e.g. HW-100231." error={fieldError('orderReference')}>
            {(f) => (
              <TextInput
                id={f.id}
                aria-describedby={f.describedBy}
                aria-invalid={f.invalid || undefined}
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                autoCapitalize="characters"
                className="uppercase"
              />
            )}
          </Field>
        )}
        <Field label="Your message" error={fieldError('message')} className="lg:col-span-2">
          {(f) => <TextArea id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid || undefined} value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000} />}
        </Field>
      </div>
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className={error.field ? 'sr-only' : 'flex items-start gap-2 rounded-[var(--radius-field)] bg-white p-3 text-[15px] font-semibold text-error ring-1 ring-error'}
        >
          {!error.field && <WarningCircleIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />}
          {error.message}
        </div>
      )}
      <Button type="submit" disabled={sending} className="lg:self-start lg:px-10">
        {sending ? 'Sending…' : 'Send message'}
      </Button>
      <p className="text-sm text-slate">We use your details only to reply to this message.</p>
    </form>
  )
}
