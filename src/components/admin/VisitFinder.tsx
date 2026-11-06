'use client'

// Finding the website visit behind a WhatsApp or phone order: roughly when
// they were on the site (UK or Pakistan time), or the phone or email they gave
// before. Each visit shows its device, the ad it came from and what it did, so
// staff can pick the right one and link its HW-V reference to the order.

import { useId, useState } from 'react'
import { CheckIcon, MagnifyingGlassIcon, PhoneIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import { Tag } from '@/components/admin/OrderBits'
import { findVisits } from '@/app/admin/(panel)/orders/actions'
import { clock, dayAndClock, duration, instantOf, isContactStep, matchedLabel, nowIn, sourceLabel, stepLabel, type FoundVisit, type TimeZoneKey } from '@/lib/admin/visits'
import { cn } from '@/lib/cn'

const input = 'min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[16px] text-zinc-900 focus:border-zinc-900 focus:outline-none'
const label = 'text-sm font-semibold text-zinc-800'

const WINDOWS = [
  { minutes: 15, label: '15 minutes either side' },
  { minutes: 30, label: '30 minutes either side' },
  { minutes: 60, label: '1 hour either side' },
  { minutes: 180, label: '3 hours either side' },
  { minutes: 720, label: 'The whole day' },
] as const

const SHOWN_STEPS = 8

function defaultZone(): TimeZoneKey {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Karachi' ? 'pk' : 'uk'
  } catch {
    return 'uk'
  }
}

/** One visit: when, which device, which ad, and what it did. Without onUse it's read-only (the order page). */
export function VisitCard({ visit, zone, chosen = false, onUse }: { visit: FoundVisit; zone: TimeZoneKey; chosen?: boolean; onUse?: (reference: string) => void }) {
  const [all, setAll] = useState(false)
  const other: TimeZoneKey = zone === 'uk' ? 'pk' : 'uk'
  const zoneName = (z: TimeZoneKey) => (z === 'uk' ? 'UK' : 'PK')
  const contact = visit.steps.filter(isContactStep)
  const matched = matchedLabel(visit.matched)
  const steps = all ? visit.steps : visit.steps.slice(0, SHOWN_STEPS)
  return (
    <li className={cn('flex flex-col gap-3 rounded-lg bg-white p-3 ring-1', chosen ? 'ring-2 ring-zinc-900' : 'ring-zinc-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-mono text-sm font-bold tracking-wide text-zinc-900">{visit.reference}</p>
          <p className="text-sm text-zinc-700">
            {dayAndClock(visit.started_at, zone)}–{clock(visit.last_at, zone)} {zoneName(zone)}
            <span className="text-zinc-500">
              {' '}
              ({clock(visit.started_at, other)}–{clock(visit.last_at, other)} {zoneName(other)}) · {duration(visit.started_at, visit.last_at)}
            </span>
          </p>
        </div>
        {onUse && (
          <button
            type="button"
            onClick={() => onUse(visit.reference)}
            aria-pressed={chosen}
            className={cn('flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold', chosen ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900 ring-1 ring-zinc-300 hover:ring-zinc-400')}
          >
            {chosen && <CheckIcon aria-hidden="true" size={16} weight="bold" />}
            {chosen ? 'Chosen for this order' : 'Use this visit'}
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-700">{[visit.device, sourceLabel(visit)].filter(Boolean).join(' · ')}</p>
      {(matched || contact.length > 0 || visit.meta_ids || visit.is_test) && (
        <div className="flex flex-wrap gap-1.5">
          {matched && <Tag tone="source">{matched}</Tag>}
          {contact.map((s) => (
            <Tag key={`${s.kind}-${s.at}`} tone="warn">
              <span className="flex items-center gap-1">
                {s.kind === 'phone_click' ? <PhoneIcon aria-hidden="true" size={14} /> : <WhatsappLogoIcon aria-hidden="true" size={14} />}
                {s.kind === 'phone_click' ? 'Tapped Call' : 'Tapped WhatsApp'} at {clock(s.at, zone)} {zoneName(zone)}
                {s.ref ? ` (${s.ref})` : ''}
              </span>
            </Tag>
          ))}
          {visit.meta_ids && <Tag>Meta click ID saved</Tag>}
          {visit.is_test && <Tag tone="test">Test</Tag>}
        </div>
      )}
      {visit.steps.length > 0 ? (
        <ol className="flex flex-col gap-1 border-l-2 border-zinc-200 pl-3">
          {steps.map((s, n) => (
            <li key={`${s.kind}-${s.at}-${n}`} className="flex gap-2 text-sm">
              <span className="w-11 shrink-0 tabular-nums text-zinc-500">{clock(s.at, zone)}</span>
              <span className={cn('text-zinc-800', isContactStep(s) && 'font-semibold')}>{stepLabel(s)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-zinc-500">Landed on {visit.landing_page ?? 'a page'}; no other steps were recorded.</p>
      )}
      {visit.steps.length > SHOWN_STEPS && (
        <button type="button" onClick={() => setAll(!all)} className="self-start text-sm font-semibold text-zinc-700 underline underline-offset-2">
          {all ? 'Show fewer steps' : `Show all ${visit.steps.length} steps`}
        </button>
      )}
      {visit.other_visits.length > 0 && (
        <div className="text-sm text-zinc-600">
          <p className="font-semibold text-zinc-700">Same device, other visits</p>
          <ul className="flex flex-col gap-0.5">
            {visit.other_visits.map((o) => (
              <li key={o.reference}>
                {dayAndClock(o.started_at, zone)} {zoneName(zone)}: {sourceLabel({ from_ad: o.medium === 'paid_social', source: o.source, medium: o.medium, campaign: null, content: o.content, referrer: null })}{' '}
                <span className="font-mono text-xs">{o.reference}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/**
 * The finder. `chosen` is the reference already in the order form; `onUse`
 * puts a visit's reference there.
 */
export function VisitFinder({ chosen, onUse, includeTests = false, contactHint = '' }: { chosen: string; onUse: (reference: string) => void; includeTests?: boolean; contactHint?: string }) {
  const id = useId()
  const [zone, setZone] = useState<TimeZoneKey>(defaultZone)
  const [when, setWhen] = useState(() => nowIn(defaultZone()))
  // About 15 ad visits an hour come in, so half an hour either side keeps the list short.
  const [minutes, setMinutes] = useState(30)
  const [adsOnly, setAdsOnly] = useState(true)
  const [contact, setContact] = useState('')
  const [visits, setVisits] = useState<FoundVisit[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [searchedZone, setSearchedZone] = useState<TimeZoneKey>(zone)

  const search = async () => {
    setBusy(true)
    setMessage(null)
    const usedContact = contact.trim() || contactHint.trim()
    const r = await findVisits({ date: when.date, time: when.time, zone, minutes, adsOnly, includeTests, contact: usedContact }).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
    setBusy(false)
    setSearchedZone(zone)
    if (r.ok) setVisits(r.visits)
    else {
      setVisits(null)
      setMessage(r.message)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <div>
        <p className="text-base font-bold">Find their website visit</p>
        <p className="text-sm text-zinc-600">
          For a customer who rang, or messaged without a reference: enter roughly when they were on the site (the time they called is usually close). The phone
          or email they gave before (a basket reminder, samples, an unconfirmed website order) finds them exactly.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-date`} className={label}>
            Date
          </label>
          <input id={`${id}-date`} type="date" value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} className={input} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-time`} className={label}>
            About what time
          </label>
          <input id={`${id}-time`} type="time" value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} className={input} />
        </div>
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className={cn(label, 'mb-1')}>That time is</legend>
        <div className="flex gap-2">
          {(['uk', 'pk'] as const).map((z) => (
            <label key={z} className={cn('flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ring-1', zone === z ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200')}>
              <input
                type="radio"
                name={`${id}-zone`}
                value={z}
                checked={zone === z}
                onChange={() => {
                  // The same moment, said in the other time zone.
                  const at = instantOf(when.date, when.time, zone)
                  setZone(z)
                  setWhen(nowIn(z, at ?? new Date()))
                }}
                className="sr-only"
              />
              {z === 'uk' ? 'UK time' : 'Pakistan time'}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-window`} className={label}>
          Look
        </label>
        <select id={`${id}-window`} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={input}>
          {WINDOWS.map((w) => (
            <option key={w.minutes} value={w.minutes}>
              {w.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-contact`} className={label}>
          Phone or email they gave before (optional)
        </label>
        <input
          id={`${id}-contact`}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={contactHint || '07… or name@…'}
          className={input}
          inputMode="email"
          autoComplete="off"
        />
        {contactHint && !contact && <p className="text-xs text-zinc-500">Leave it empty to use the phone number in the customer details.</p>}
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={adsOnly} onChange={(e) => setAdsOnly(e.target.checked)} className="size-5 accent-zinc-900" />
        Only visits from our Meta ads
      </label>
      <button type="button" onClick={search} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
        <MagnifyingGlassIcon aria-hidden="true" size={16} weight="bold" />
        {busy ? 'Looking…' : 'Find visits'}
      </button>
      <div aria-live="polite" className="flex flex-col gap-3">
        {message && <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 ring-1 ring-red-200">{message}</p>}
        {visits && visits.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-600">
            No visits then.{adsOnly ? ' Untick “Only visits from our Meta ads”, or look further either side.' : ' Try looking further either side.'}
          </p>
        )}
        {visits && visits.length > 0 && (
          <>
            <p className="text-sm text-zinc-600">
              {visits.length === 30 ? 'The 30 closest visits' : `${visits.length} visit${visits.length === 1 ? '' : 's'}`}, closest first. Ask what they looked at and
              which phone they used, then pick the one that fits.
            </p>
            <ul className="flex flex-col gap-3">
              {visits.map((v) => (
                <VisitCard key={v.reference} visit={v} zone={searchedZone} chosen={chosen === v.reference} onUse={onUse} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
