'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { CheckCircleIcon, CopyIcon, PhoneIcon } from '@phosphor-icons/react'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { CONTACT, phoneHref } from '@/config/contact'
import { platformOf } from '@/lib/whatsapp/handoff'
import { HELP_EVENT, watchHandoff, type WhatsAppHelpRequest } from '@/lib/whatsapp/help'
import { noteVisit } from '@/lib/tracking/browser'
import { requestWhatsAppCallback } from './actions'

/**
 * The way in when WhatsApp doesn't open after a tap (owner, 10 November 2026:
 * plenty of taps, no messages): open it again, copy our number, call, or leave
 * a number and we message them. Also opened on purpose ("Or we'll message
 * you"). One for the whole shop, in its frame; WhatsAppButton and those links
 * open it through an event (src/lib/whatsapp/help.ts).
 */
export function WhatsAppHelp() {
  const [request, setRequest] = useState<WhatsAppHelpRequest | null>(null)

  useEffect(() => {
    const open = (e: Event) => setRequest((e as CustomEvent<WhatsAppHelpRequest>).detail)
    window.addEventListener(HELP_EVENT, open)
    return () => window.removeEventListener(HELP_EVENT, open)
  }, [])

  if (!CONTACT.whatsAppNumber) return null
  return (
    <Sheet open={request !== null} onClose={() => setRequest(null)} title={request?.mode === 'callback' ? 'We’ll message you on WhatsApp' : 'Message us on WhatsApp'}>
      {request && <HelpBody request={request} onDone={() => setRequest(null)} />}
    </Sheet>
  )
}

function HelpBody({ request, onDone }: { request: WhatsAppHelpRequest; onDone: () => void }) {
  const tel = phoneHref()
  if (request.mode === 'callback') return <CallbackForm request={request} onDone={onDone} primary />

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[16px] leading-relaxed">WhatsApp didn’t seem to open. Try once more, or message our number from WhatsApp yourself.</p>
      {request.web && (
        <a
          href={request.web}
          target={request.newTab ? '_blank' : undefined}
          rel="noopener"
          onClick={() => watchHandoff({ ...request, platform: platformOf(navigator.userAgent), retry: true })}
          className={buttonClasses({ variant: 'primary', block: true })}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white">
            <WhatsAppGlyph size={22} />
          </span>
          Open WhatsApp
        </a>
      )}
      <CopyNumber />
      {tel && (
        <a href={tel} className="flex items-center justify-center gap-2 text-[16px] font-semibold text-velvet">
          <PhoneIcon aria-hidden="true" size={20} /> Or call us on {CONTACT.phoneDisplay}
        </a>
      )}
      <div className="border-t border-line pt-5">
        <CallbackForm request={request} onDone={onDone} primary={false} />
      </div>
    </div>
  )
}

/** Our number, to type or paste into WhatsApp; copying works in the apps' browsers too (with an older fallback). */
function CopyNumber() {
  const [copied, setCopied] = useState<boolean | null>(null)
  const number = CONTACT.phoneDisplay ?? ''

  async function copy() {
    let ok = false
    try {
      await navigator.clipboard.writeText(number)
      ok = true
    } catch {
      const field = document.createElement('textarea')
      field.value = number
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.append(field)
      field.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      field.remove()
    }
    setCopied(ok)
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-[14px] text-slate">Our WhatsApp number</span>
          <span className="select-all font-display text-[26px] leading-tight">{number}</span>
        </span>
        <button type="button" onClick={copy} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}>
          {copied ? <CheckCircleIcon aria-hidden="true" size={18} weight="fill" /> : <CopyIcon aria-hidden="true" size={18} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p aria-live="polite" className="text-[14px] text-slate empty:hidden">
        {copied === true ? 'Copied. Open WhatsApp, start a new chat and paste it.' : copied === false ? 'Press and hold the number to copy it.' : ''}
      </p>
    </div>
  )
}

function CallbackForm({ request, onDone, primary }: { request: WhatsAppHelpRequest; onDone: () => void; primary: boolean }) {
  const id = useId()
  const pathname = usePathname()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (done !== null) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="flex items-start gap-2.5 text-[17px] leading-relaxed">
          <CheckCircleIcon aria-hidden="true" size={26} weight="fill" className="mt-0.5 shrink-0 text-velvet" />
          <span>
            Thank you. We’ll message you on WhatsApp{done ? ` at ${done}` : ''} as soon as we can.
          </span>
        </p>
        <Button variant="secondary" block onClick={onDone}>
          Close
        </Button>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    const r = await requestWhatsAppCallback({ name, phone, product: request.productName, reference: request.reference, page: pathname, website }).catch(() => ({
      ok: false as const,
      message: 'We couldn’t reach the server. Please try again.',
    }))
    setSending(false)
    if (!r.ok) return setError(r.message)
    noteVisit('whatsapp_callback', request.reference ? { name: request.reference } : {})
    setDone(r.phone)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {!primary && <h3 className="text-[20px] leading-tight">Or we’ll message you</h3>}
      <p className="text-[15px] leading-relaxed text-slate">
        Leave your mobile number and we’ll send you a WhatsApp message{request.productName ? ` about the ${request.productName}` : ''}.
      </p>
      <Field label="Your mobile number" error={error ?? undefined}>
        {(f) => (
          <TextInput
            id={f.id}
            aria-describedby={f.describedBy}
            aria-invalid={f.invalid || undefined}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07700 900123"
          />
        )}
      </Field>
      <Field label="Your name (if you like)">
        {(f) => <TextInput id={f.id} aria-describedby={f.describedBy} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />}
      </Field>
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <Button type="submit" variant={primary ? 'primary' : 'secondary'} block disabled={sending}>
        {sending ? 'Sending…' : 'Message me on WhatsApp'}
      </Button>
      <p className="text-[13px] text-slate">We only use your number to message you about this.</p>
    </form>
  )
}
