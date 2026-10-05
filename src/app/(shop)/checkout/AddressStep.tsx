'use client'

import { useId, useState } from 'react'
import { InfoIcon } from '@phosphor-icons/react'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { TextInput } from '@/components/ui/Field'
import { postcodeOutcome, type PostcodeOutcome } from '@/lib/product/helpers'
import { recallPostcode } from '@/lib/basket/store'
import { lookupAddresses } from './actions'

export interface AddressValue {
  postcode: string
  /** What the postcode check said; only "free" (or "depends" with an address picked) can order online. */
  outcome: PostcodeOutcome
  line: string
}

type Mode = 'idle' | 'loading' | 'list' | 'manual'

const fieldClass = 'flex flex-col gap-2'
const labelClass = 'text-base font-semibold'

/**
 * Postcode first, then the address: picked from the lookup when one is set
 * up, otherwise typed. Postcodes the online checkout doesn't cover get a
 * quote route instead, never a dead end.
 */
export function AddressStep({
  value,
  onChange,
  lookupAvailable,
  error,
  basketSummary,
}: {
  value: AddressValue
  onChange: (v: AddressValue) => void
  lookupAvailable: boolean
  error: string | null
  basketSummary: string
}) {
  const id = useId()
  // This step only renders in the browser, so the postcode checked on a product page can fill it in.
  const [typed, setTyped] = useState(() => {
    if (value.postcode) return value.postcode
    const saved = postcodeOutcome(recallPostcode())
    return saved.kind === 'free' ? saved.postcode : ''
  })
  const [mode, setMode] = useState<Mode>(value.line ? 'manual' : 'idle')
  const [addresses, setAddresses] = useState<string[]>([])
  const [manual, setManual] = useState({ line1: '', line2: '', town: '' })
  const [notice, setNotice] = useState<string | null>(null)

  const setManualField = (key: keyof typeof manual, v: string) => {
    const next = { ...manual, [key]: v }
    setManual(next)
    onChange({ ...value, line: [next.line1, next.line2, next.town].map((s) => s.trim()).filter(Boolean).join(', ') })
  }

  const find = async () => {
    const outcome = postcodeOutcome(typed)
    setNotice(null)
    onChange({ postcode: outcome.kind === 'free' || outcome.kind === 'quote' || outcome.kind === 'depends' ? outcome.postcode : typed, outcome, line: '' })
    if (outcome.kind === 'free' || outcome.kind === 'quote' || outcome.kind === 'depends') setTyped(outcome.postcode)
    if (outcome.kind !== 'free' && outcome.kind !== 'depends') {
      setMode('idle')
      return
    }
    if (!lookupAvailable) {
      // Without a lookup we can't tell which side of the water a mixed district address is on.
      if (outcome.kind === 'depends') onChange({ postcode: outcome.postcode, outcome: { kind: 'quote', area: outcome.area, postcode: outcome.postcode, place: null }, line: '' })
      else setMode('manual')
      return
    }
    setMode('loading')
    const res = await lookupAddresses(outcome.postcode).catch(() => ({ available: false, addresses: [] as string[] }))
    if (res.available && res.addresses.length) {
      setAddresses(res.addresses)
      setMode('list')
    } else {
      setMode('manual')
      setNotice(res.available ? 'We couldn’t find addresses for that postcode. Please type yours below.' : null)
    }
  }

  const o = value.outcome
  const quoteHref =
    o.kind === 'quote'
      ? (whatsAppHref(`Hi Heartwell, could I have a delivery quote for ${o.postcode}? I'd like: ${basketSummary}`) ??
        `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Delivery quote for ${o.postcode}`)}&body=${encodeURIComponent(`I'd like: ${basketSummary}`)}`)
      : null

  return (
    <div className="flex flex-col gap-4">
      <div className={fieldClass}>
        <label htmlFor={`${id}-pc`} className={labelClass}>
          Postcode
        </label>
        <div className="flex gap-2">
          <TextInput
            id={`${id}-pc`}
            name="postal-code"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void find()
              }
            }}
            autoComplete="postal-code"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="search"
            aria-invalid={o.kind === 'invalid' || (error !== null && !value.line) || undefined}
            aria-describedby={o.kind === 'invalid' ? `${id}-pc-error` : undefined}
            className="min-w-0 flex-1 uppercase"
          />
          <button type="button" onClick={() => void find()} className="min-h-[54px] shrink-0 rounded-[var(--radius-field)] bg-velvet-sheen px-5 font-semibold text-white">
            {lookupAvailable ? 'Find address' : 'Continue'}
          </button>
        </div>
        {o.kind === 'invalid' && (
          <span id={`${id}-pc-error`} className="text-[15px] font-semibold text-error">
            Please enter a full UK postcode, like LS6 2AB.
          </span>
        )}
      </div>

      {o.kind === 'quote' && quoteHref && (
        <div role="status" className="flex flex-col gap-2 rounded-[var(--radius-field)] bg-gold-cream-tint p-4 text-[15px]">
          <p className="flex items-start gap-2">
            <InfoIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-velvet" />
            <span>
              We deliver to {o.place ?? o.area} by arrangement, not through the online checkout. Send us your basket and we’ll come back with a
              delivery quote.
            </span>
          </p>
          <a href={quoteHref} className="self-start font-semibold">
            Ask for a delivery quote
          </a>
        </div>
      )}

      {mode === 'loading' && (
        <p role="status" className="text-[15px] text-slate">
          Finding addresses…
        </p>
      )}

      {mode === 'list' && (o.kind === 'free' || o.kind === 'depends') && (
        <div className={fieldClass}>
          <label htmlFor={`${id}-pick`} className={labelClass}>
            Choose your address
          </label>
          <select
            id={`${id}-pick`}
            value={value.line}
            onChange={(e) => {
              if (e.target.value === '__manual') {
                setMode('manual')
                onChange({ ...value, line: '' })
              } else onChange({ ...value, line: e.target.value })
            }}
            aria-invalid={(error !== null && !value.line) || undefined}
            className="min-h-[54px] w-full rounded-[var(--radius-field)] border-[1.5px] border-field bg-white px-3.5 text-ink focus:border-velvet focus:outline-none"
          >
            <option value="">Select your address</option>
            {addresses.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="__manual">My address isn’t listed</option>
          </select>
        </div>
      )}

      {mode === 'manual' && (o.kind === 'free' || o.kind === 'depends') && (
        <div className="flex flex-col gap-3">
          {notice && <p className="text-[15px] text-slate">{notice}</p>}
          <div className={fieldClass}>
            <label htmlFor={`${id}-l1`} className={labelClass}>
              House number and street
            </label>
            <TextInput id={`${id}-l1`} autoComplete="address-line1" value={manual.line1} onChange={(e) => setManualField('line1', e.target.value)} aria-invalid={(error !== null && !manual.line1) || undefined} />
          </div>
          <div className={fieldClass}>
            <label htmlFor={`${id}-l2`} className={labelClass}>
              Flat, building or area <span className="font-normal text-slate">(optional)</span>
            </label>
            <TextInput id={`${id}-l2`} autoComplete="address-line2" value={manual.line2} onChange={(e) => setManualField('line2', e.target.value)} />
          </div>
          <div className={fieldClass}>
            <label htmlFor={`${id}-town`} className={labelClass}>
              Town or city
            </label>
            <TextInput id={`${id}-town`} autoComplete="address-level2" value={manual.town} onChange={(e) => setManualField('town', e.target.value)} aria-invalid={(error !== null && !manual.town) || undefined} />
          </div>
        </div>
      )}

      {error && (
        <span className="text-[15px] font-semibold text-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
