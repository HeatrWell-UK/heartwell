'use client'

import { useId, useState } from 'react'
import { subscribe } from '@/app/(shop)/newsletter/actions'

/** "Get our emails", in the footer: one field, double opt-in. */
export function NewsletterSignup() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        setSending(true)
        const r = await subscribe(email, website).catch(() => ({ ok: false, message: 'Something went wrong. Please try again.' }))
        setSending(false)
        setResult(r)
        if (r.ok) setEmail('')
      }}
    >
      <label htmlFor={`${id}-email`} className="text-[15px] font-bold">
        New sofas and offers by email
      </label>
      <p id={`${id}-help`} className="text-[13px] text-on-wine-muted">
        We’ll ask you to confirm first. Stop any time.
      </p>
      <div className="flex gap-2">
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={`${id}-help${result ? ` ${id}-result` : ''}`}
          aria-invalid={result && !result.ok ? true : undefined}
          placeholder="Your email"
          className="min-h-12 min-w-0 flex-1 rounded-[var(--radius-field)] border border-white/30 bg-white/10 px-3.5 text-[17px] text-white placeholder:text-on-wine-muted focus:border-gold-pale focus:outline-none"
        />
        <button type="submit" disabled={sending} className="bg-gold-sheen min-h-12 shrink-0 rounded-full px-5 font-semibold text-wine disabled:opacity-70">
          {sending ? 'Sending…' : 'Sign up'}
        </button>
      </div>
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <p id={`${id}-result`} role="status" className={result ? (result.ok ? 'text-[15px] text-gold-pale' : 'text-[15px] font-semibold text-white') : 'sr-only'}>
        {result?.message}
      </p>
    </form>
  )
}
