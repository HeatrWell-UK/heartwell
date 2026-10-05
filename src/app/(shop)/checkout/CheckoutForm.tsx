'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { LockSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { ButtonLink } from '@/components/ui/Button'
import { TextArea, TextInput } from '@/components/ui/Field'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useBasket, visitIds, rememberPostcode } from '@/lib/basket/store'
import { useHydrated } from '@/lib/basket/use-hydrated'
import { deliveryLines, floorName, quoteDelivery, type DeliverySettings } from '@/lib/delivery/pricing'
import { isUkPhone } from '@/lib/checkout/phone'
import type { PlainError } from '@/lib/checkout/order'
import { refreshBasket } from '../basket/actions'
import { placeOrder, quoteCheckout, saveBasketReminder, type CheckoutQuote } from './actions'
import { AddressStep, type AddressValue } from './AddressStep'

interface Props {
  settings: DeliverySettings
  windowLabel: string
  earliestDate: string
  latestDate: string
  lookupAvailable: boolean
}

type FieldKey = NonNullable<PlainError['field']>

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function CheckoutForm({ settings, windowLabel, earliestDate, latestDate, lookupAvailable }: Props) {
  const router = useRouter()
  const basket = useBasket()
  const hydrated = useHydrated()
  const id = useId()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState<AddressValue>({ postcode: '', outcome: { kind: 'empty' }, line: '' })
  const [floor, setFloor] = useState(0)
  const [hasLift, setHasLift] = useState(false)
  const [assembly, setAssembly] = useState(false)
  const [removal, setRemoval] = useState(false)
  const [removalSeats, setRemovalSeats] = useState(settings.removal_default_seats)
  const [preferredDate, setPreferredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [code, setCode] = useState('')
  const [reminder, setReminder] = useState(false)
  const [website, setWebsite] = useState('')

  const [quote, setQuote] = useState<{ key: string; value: CheckoutQuote } | null>(null)
  const [quoteError, setQuoteError] = useState<PlainError | null>(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<PlainError | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const errorRef = useRef<HTMLDivElement>(null)
  const refreshed = useRef(false)

  // Once per visit: bring basket prices and availability up to date.
  useEffect(() => {
    if (!hydrated || refreshed.current || basket.lines.length === 0) return
    refreshed.current = true
    refreshBasket(basket.lines.map(({ id: lineId, variantId, materialId }) => ({ id: lineId, variantId, materialId })))
      .then((res) => {
        if (res.ok) basket.refresh(res.views)
      })
      .catch(() => {})
  }, [hydrated, basket])

  const items = useMemo(() => basket.lines.map((l) => ({ id: l.id, variantId: l.variantId, materialId: l.materialId, quantity: l.quantity })), [basket.lines])
  const extras = useMemo(() => ({ floor, hasLift: floor > 0 && hasLift, assembly, removal, removalSeats: removal ? removalSeats : null }), [floor, hasLift, assembly, removal, removalSeats])
  const quoteInput = useMemo(() => ({ items, extras, promotionCode: code || undefined }), [items, extras, code])
  const quoteKey = JSON.stringify(quoteInput)
  const quoteIsCurrent = quote?.key === quoteKey

  // The database's price for exactly this basket and these extras (debounced).
  useEffect(() => {
    if (!hydrated || items.length === 0) return
    const timer = window.setTimeout(() => {
      quoteCheckout(quoteInput)
        .then((res) => {
          if (res.ok) {
            setQuote({ key: quoteKey, value: res.quote })
            setQuoteError(null)
          } else setQuoteError(res.error)
        })
        .catch(() => setQuoteError({ code: 'NETWORK', message: 'We couldn’t reach the shop to check prices. Please check your connection.' }))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [hydrated, items.length, quoteInput, quoteKey])

  // Instant figures while the database's answer is on its way.
  const local = quoteDelivery({ floor, hasLift, assembly, removal, removalSeats }, settings)
  const subtotal = basket.subtotal
  const shown = quoteIsCurrent && quote ? quote.value : null
  const total = shown ? shown.total : subtotal + local.total
  const lines = deliveryLines(shown ? shown.delivery : local, settings)
  const madeToOrder = basket.lines.some((l) => l.view.madeToOrder || l.materialId !== null)
  const canOrderHere = address.outcome.kind === 'free' || address.outcome.kind === 'depends'
  const basketSummary = basket.lines.map((l) => `${l.quantity} x ${l.view.title} (${l.view.option})`).join('; ')

  const saveReminder = (opt: boolean) => {
    const visitor = visitIds()
    if (!opt || !visitor) return
    void saveBasketReminder({
      visitor,
      email: EMAIL.test(email.trim()) ? email.trim() : '',
      phone,
      emailOptIn: EMAIL.test(email.trim()),
      whatsAppOptIn: isUkPhone(phone),
      name,
      basket: basket.lines.map((l) => ({ title: l.view.title, option: l.view.option, quantity: l.quantity, slug: l.view.slug })),
    }).catch(() => {})
  }

  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {}
    if (name.trim().length < 2) e.name = 'Please enter your full name.'
    if (!isUkPhone(phone)) e.phone = 'Please enter a UK phone number, like 07700 900123.'
    if (email.trim() && !EMAIL.test(email.trim())) e.email = 'Please check your email address.'
    if (!canOrderHere) e.postcode = address.outcome.kind === 'quote' ? 'This postcode needs a delivery quote.' : 'Please enter your postcode and press Find address.'
    else if (address.line.trim().length < 5) e.address = 'Please choose or type your address.'
    return e
  }

  const submit = async () => {
    setError(null)
    const e = validate()
    setFieldErrors(e)
    if (Object.keys(e).length) {
      setError({ code: 'BAD_INPUT', message: 'Please check the highlighted details.' })
      errorRef.current?.focus()
      return
    }
    if (!shown) {
      setError(quoteError ?? { code: 'QUOTING', message: 'Just checking the latest prices. Please try again in a moment.' })
      errorRef.current?.focus()
      return
    }
    setPlacing(true)
    rememberPostcode(address.postcode)
    const res = await placeOrder({
      ...quoteInput,
      name,
      phone,
      email: email.trim(),
      postcode: address.postcode,
      shippingAddress: address.line,
      preferredDate,
      notes,
      expectedTotal: shown.total,
      visitor: visitIds(),
      website,
    }).catch(() => ({ ok: false as const, error: { code: 'NETWORK', message: 'We couldn’t reach the shop. Please check your connection and try again; your order wasn’t placed.' } as PlainError }))
    if (res.ok) {
      basket.clear()
      router.push(`/order/${res.id}`)
      return
    }
    setPlacing(false)
    setError(res.error)
    if (res.error.field) setFieldErrors({ [res.error.field]: res.error.message })
    if (res.error.code === 'PRICE_MISMATCH') setQuote(null)
    errorRef.current?.focus()
  }

  if (!hydrated) return <div className="min-h-[60vh]" aria-busy="true" />

  if (basket.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-[17px] text-slate">Your basket is empty.</p>
        <ButtonLink href="/sofas">Shop sofas</ButtonLink>
      </div>
    )
  }

  const err = (k: FieldKey) => fieldErrors[k]
  const describedBy = (k: FieldKey, help?: string) => [help, err(k) ? `${id}-${k}-error` : null].filter(Boolean).join(' ') || undefined
  const sectionClass = 'flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-4 lg:p-6'
  const legendClass = 'font-display text-[22px] font-bold'

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10"
    >
      <div className="flex flex-col gap-6">
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-field)] border-2 border-error bg-white p-4 text-[15px] font-semibold text-error">
              <WarningCircleIcon aria-hidden="true" size={22} className="shrink-0" />
              {error.message}
            </p>
          )}
        </div>

        <fieldset className={sectionClass}>
          <legend className={cn(legendClass, 'float-left w-full')}>1. Your details</legend>
          <Field label="Full name" id={`${id}-name`} error={err('name')} errorId={`${id}-name-error`}>
            <TextInput id={`${id}-name`} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err('name') || undefined} aria-describedby={describedBy('name')} />
          </Field>
          <Field label="Mobile number" help="We ring to book your delivery day." helpId={`${id}-phone-help`} id={`${id}-phone`} error={err('phone')} errorId={`${id}-phone-error`}>
            <TextInput
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => reminder && saveReminder(true)}
              aria-invalid={!!err('phone') || undefined}
              aria-describedby={describedBy('phone', `${id}-phone-help`)}
            />
          </Field>
          <Field
            label="Email"
            optional
            help="We email your order and the link to confirm it. No email? We’ll WhatsApp you instead."
            helpId={`${id}-email-help`}
            id={`${id}-email`}
            error={err('email')}
            errorId={`${id}-email-error`}
          >
            <TextInput
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => reminder && saveReminder(true)}
              aria-invalid={!!err('email') || undefined}
              aria-describedby={describedBy('email', `${id}-email-help`)}
            />
          </Field>
        </fieldset>

        <fieldset className={sectionClass}>
          <legend className={cn(legendClass, 'float-left w-full')}>2. Delivery address</legend>
          <AddressStep
            value={address}
            onChange={(v) => {
              setAddress(v)
              setFieldErrors((f) => ({ ...f, postcode: undefined, address: undefined }))
            }}
            lookupAvailable={lookupAvailable}
            error={err('postcode') ?? err('address') ?? null}
            basketSummary={basketSummary}
          />
        </fieldset>

        <fieldset className={sectionClass} disabled={!canOrderHere && address.outcome.kind === 'quote'}>
          <legend className={cn(legendClass, 'float-left w-full')}>3. Delivery</legend>
          <p className="text-[15px] text-slate">
            Free to the ground floor anywhere on UK Mainland. Most orders arrive {windowLabel}; we ring to book the day.
          </p>
          <Field label="Which floor is the room on?" id={`${id}-floor`}>
            <select
              id={`${id}-floor`}
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="min-h-[54px] w-full rounded-[var(--radius-field)] border-[1.5px] border-field bg-white px-3.5 text-ink focus:border-velvet focus:outline-none"
            >
              {Array.from({ length: settings.max_floor + 1 }, (_, f) => (
                <option key={f} value={f}>
                  {floorName(f)}
                  {f === 0 ? ' (free)' : ''}
                </option>
              ))}
            </select>
          </Field>
          {floor > 0 && (
            <Check id={`${id}-lift`} checked={hasLift} onChange={setHasLift} label="There’s a lift we can use" hint={`With a lift, any floor is ${formatPrice(settings.upstairs_first_floor)}.`} />
          )}
          <Check id={`${id}-asm`} checked={assembly} onChange={setAssembly} label={`Assemble it in my room (${formatPrice(settings.assembly_fee)})`} />
          <Check id={`${id}-rem`} checked={removal} onChange={setRemoval} label={`Take my old sofa away (${formatPrice(settings.removal_per_seat)} a seat)`} />
          {removal && (
            <Field label="How many seats is your old sofa?" id={`${id}-seats`}>
              <select
                id={`${id}-seats`}
                value={removalSeats}
                onChange={(e) => setRemovalSeats(Number(e.target.value))}
                className="min-h-[54px] w-full rounded-[var(--radius-field)] border-[1.5px] border-field bg-white px-3.5 text-ink focus:border-velvet focus:outline-none"
              >
                {Array.from({ length: settings.removal_max_seats - settings.removal_min_seats + 1 }, (_, i) => settings.removal_min_seats + i).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'seat' : 'seats'} ({formatPrice(n * settings.removal_per_seat)})
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Preferred delivery day" optional help="We’ll ring to agree the day either way." helpId={`${id}-date-help`} id={`${id}-date`} error={err('date')} errorId={`${id}-date-error`}>
            <TextInput
              id={`${id}-date`}
              type="date"
              min={earliestDate}
              max={latestDate}
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              aria-invalid={!!err('date') || undefined}
              aria-describedby={describedBy('date', `${id}-date-help`)}
            />
          </Field>
        </fieldset>

        <fieldset className={sectionClass}>
          <legend className={cn(legendClass, 'float-left w-full')}>4. Anything else?</legend>
          <Field label="Delivery notes" optional help="Parking, steps, a tight turn on the stairs: anything that helps the drivers." helpId={`${id}-notes-help`} id={`${id}-notes`}>
            <TextArea id={`${id}-notes`} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} aria-describedby={`${id}-notes-help`} />
          </Field>
          <details className="group" open={code !== ''}>
            <summary className="cursor-pointer list-none text-[15px] font-semibold text-velvet [&::-webkit-details-marker]:hidden">Have an offer code?</summary>
            <div className="flex gap-2 pt-3">
              <label htmlFor={`${id}-code`} className="sr-only">
                Offer code
              </label>
              <TextInput id={`${id}-code`} value={codeInput} onChange={(e) => setCodeInput(e.target.value)} autoCapitalize="characters" spellCheck={false} className="min-w-0 flex-1 uppercase" />
              <button type="button" onClick={() => setCode(codeInput.trim().toUpperCase())} className="min-h-[54px] shrink-0 rounded-[var(--radius-field)] border-[1.5px] border-velvet px-5 font-semibold text-velvet">
                Apply
              </button>
            </div>
            {code && shown && (
              <p role="status" className={cn('pt-2 text-[15px]', shown.codeValid ? 'text-ink' : 'font-semibold text-error')}>
                {shown.codeValid
                  ? shown.discountAmount > 0
                    ? `${code} applied: ${formatPrice(shown.discountAmount)} off.`
                    : `${code} is valid, but doesn’t apply to the pieces in your basket.`
                  : `We don’t recognise ${code}. Please check it.`}
              </p>
            )}
          </details>
          <Check
            id={`${id}-remind`}
            checked={reminder}
            onChange={(v) => {
              setReminder(v)
              saveReminder(v)
            }}
            label="If I don’t finish, remind me about my basket"
            hint="By email or WhatsApp, using the details above. We keep it for 90 days at most."
          />
          <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${id}-website`}>Website</label>
            <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </fieldset>
      </div>

      <section aria-labelledby={`${id}-summary`} className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-stone p-4 lg:sticky lg:top-6 lg:p-6">
        <h2 id={`${id}-summary`} className="text-[22px]">
          Your order
        </h2>
        <ul className="flex flex-col gap-3">
          {basket.lines.map((l) => (
            <li key={l.id} className="flex gap-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                {l.view.image && <Image src={l.view.image} alt="" width={64} height={64} className="size-full object-cover" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-[15px] leading-snug">
                <span className="font-semibold">
                  {l.quantity > 1 ? `${l.quantity} × ` : ''}
                  {l.view.title}
                </span>
                <span className="text-sm text-slate">{l.view.option}</span>
              </span>
              <span className="shrink-0 text-[15px] font-semibold">{formatPrice(l.view.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <Link href="/basket" className="self-start text-sm font-semibold">
          Change basket
        </Link>
        <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[15px]">
          <Row label="Items" value={formatPrice(shown ? shown.itemsSubtotal : subtotal)} />
          {shown && shown.discountAmount > 0 && <Row label={`Offer${shown.promotionCode ? ` (${shown.promotionCode})` : ''}`} value={`−${formatPrice(shown.discountAmount)}`} />}
          <Row label="Delivery to UK Mainland" value="Free" accent />
          {lines.map((l) => (
            <Row key={l.key} label={l.detail ? `${l.label} (${l.detail})` : l.label} value={formatPrice(l.amount)} />
          ))}
          <div className="mt-1 border-t border-line pt-2">
            <Row label="To pay today" value="£0" />
            <Row label="To pay on delivery" value={formatPrice(total)} strong />
          </div>
        </dl>
        <p className="text-sm text-slate" aria-live="polite">
          {quoteIsCurrent ? 'Cash or bank transfer to the driver, once it’s in your room.' : quoteError ? quoteError.message : 'Checking the latest prices…'}
        </p>
        {madeToOrder && (
          <p className="rounded-[var(--radius-field)] bg-white p-3 text-sm leading-snug">
            Made-to-order pieces are built for you, so they can’t be returned for a change of mind. Faults are always covered.
          </p>
        )}
        <button
          type="submit"
          disabled={placing || address.outcome.kind === 'quote'}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-velvet-sheen px-6 text-[17px] font-semibold text-white disabled:bg-none disabled:bg-line-soft disabled:text-slate"
        >
          <LockSimpleIcon aria-hidden="true" size={20} />
          {placing ? 'Placing your order…' : 'Place order: pay nothing today'}
        </button>
        <p className="text-[13px] leading-snug text-slate">
          We’ll email and WhatsApp you a link to confirm your order, then ring to book the day. By placing your order you agree to our{' '}
          <Link href="/terms">terms</Link>.
        </p>
      </section>
    </form>
  )
}

function Field({
  label,
  id,
  help,
  helpId,
  error,
  errorId,
  optional,
  children,
}: {
  label: string
  id: string
  help?: string
  helpId?: string
  error?: string
  errorId?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold">
        {label} {optional && <span className="font-normal text-slate">(optional)</span>}
      </label>
      {help && (
        <span id={helpId} className="text-sm text-slate">
          {help}
        </span>
      )}
      {children}
      {error && (
        <span id={errorId} className="text-[15px] font-semibold text-error">
          {error}
        </span>
      )}
    </div>
  )
}

function Check({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-velvet" aria-describedby={hint ? `${id}-hint` : undefined} />
      <label htmlFor={id} className="flex flex-col text-base">
        <span className="font-semibold">{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="text-sm text-slate">
            {hint}
          </span>
        )}
      </label>
    </div>
  )
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'text-[17px] font-semibold')}>
      <dt>{label}</dt>
      <dd className={cn('shrink-0', accent && 'font-semibold text-velvet')}>{value}</dd>
    </div>
  )
}
