'use client'

import { useId, useState } from 'react'
import { CheckCircleIcon, StarIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, TextArea, TextInput } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { submitReview } from './actions'

const WORDS = ['', 'Poor', 'Not great', 'Fine', 'Good', 'Excellent']

export function ReviewForm({ token, productId, productTitle, suggestedName }: { token: string; productId: string; productTitle: string; suggestedName: string }) {
  const id = useId()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [name, setName] = useState(suggestedName)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-[var(--radius-field)] bg-gold-cream-tint p-4 text-[16px] font-semibold">
        <CheckCircleIcon aria-hidden="true" size={26} weight="fill" className="shrink-0 text-velvet" />
        Thank you. We’ll publish your review once we’ve read it.
      </p>
    )
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (rating === 0) return setError('Please choose a star rating.')
        setSending(true)
        setError(null)
        const r = await submitReview({ token, productId, rating, title, comment, name }).catch(() => ({ ok: false as const, message: 'We couldn’t reach the server. Please try again.' }))
        setSending(false)
        if (r.ok) setDone(true)
        else setError(r.message)
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-semibold">Your rating for the {productTitle}</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-full p-1 has-[:focus-visible]:shadow-[var(--shadow-focus)]">
              <input type="radio" name={`${id}-rating`} value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <StarIcon aria-hidden="true" size={36} weight={n <= rating ? 'fill' : 'regular'} className={cn(n <= rating ? 'text-gold' : 'text-field')} />
              <span className="sr-only">
                {n} {n === 1 ? 'star' : 'stars'}: {WORDS[n]}
              </span>
            </label>
          ))}
          {rating > 0 && <span className="pl-2 text-[15px] font-semibold text-slate">{WORDS[rating]}</span>}
        </div>
      </fieldset>
      <Field label="Headline (optional)">
        {(f) => <TextInput id={f.id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Comfy and well made" />}
      </Field>
      <Field label="Your review (optional)" help="How does it look and feel? How was the delivery?">
        {(f) => <TextArea id={f.id} aria-describedby={f.describedBy} value={comment} onChange={(e) => setComment(e.target.value)} rows={5} maxLength={2000} />}
      </Field>
      <Field label="Name to show" help="We suggest your first name and initial.">
        {(f) => <TextInput id={f.id} aria-describedby={f.describedBy} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" />}
      </Field>
      {error && (
        <p role="alert" className="text-[15px] font-semibold text-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={sending} className="lg:self-start lg:px-10">
        {sending ? 'Sending…' : 'Send my review'}
      </Button>
    </form>
  )
}
