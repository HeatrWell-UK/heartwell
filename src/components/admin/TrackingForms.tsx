'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { saveTrackingSettings } from '@/app/admin/(panel)/tracking/actions'
import { isStaffDevice, setStaffDevice } from '@/lib/tracking/browser'
import type { TrackingMode } from '@/config/tracking'
import { cn } from '@/lib/cn'
import { OutcomeNote, primaryButton, secondaryButton, TextField, type Outcome } from './Fields'

const MODES: { value: TrackingMode; title: string; body: string }[] = [
  { value: 'dry_run', title: 'Dry run', body: 'Every event is built and shown below, and nothing is sent anywhere. Safe at any time.' },
  { value: 'test', title: 'Test', body: 'Events go to Meta’s Test events tab and GA4’s checker only. Nothing counts towards ads or reports.' },
  { value: 'live', title: 'Live', body: 'Real events from the live site. Staging, test orders, QA links and staff devices still never count.' },
]

export function TrackingSettingsForm({ initial }: { initial: { mode: TrackingMode; purchaseMode: 'automatic' | 'manual'; holdMinutes: number } }) {
  const router = useRouter()
  const [mode, setMode] = useState(initial.mode)
  const [purchaseMode, setPurchaseMode] = useState(initial.purchaseMode)
  const [hold, setHold] = useState(String(initial.holdMinutes))
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (mode === 'live' && initial.mode !== 'live' && !window.confirm('Switch to Live? Real events will reach Meta and Google from the live site.')) return
        setSaving(true)
        const r = await saveTrackingSettings({ mode, purchaseMode, holdMinutes: Number(hold) || 0 }).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
        setSaving(false)
        setOutcome(r)
        if (r.ok) router.refresh()
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-zinc-800">Tracking mode</legend>
        {MODES.map((m) => (
          <label key={m.value} className={cn('flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1', mode === m.value ? 'bg-zinc-50 ring-zinc-900' : 'ring-zinc-200')}>
            <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="mt-1 size-4 accent-zinc-900" />
            <span className="flex flex-col">
              <span className="font-semibold text-zinc-900">{m.title}</span>
              <span className="text-sm text-zinc-600">{m.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-zinc-800">Purchase to Meta and GA4</legend>
        {(
          [
            ['automatic', 'Automatic', 'Sent on its own after the hold below, giving time to mark a mistaken order as a test or cancel it. Recommended.'],
            ['manual', 'Manual', 'Each confirmed order waits until you press Send now below.'],
          ] as const
        ).map(([value, title, body]) => (
          <label key={value} className={cn('flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1', purchaseMode === value ? 'bg-zinc-50 ring-zinc-900' : 'ring-zinc-200')}>
            <input type="radio" name="purchase" value={value} checked={purchaseMode === value} onChange={() => setPurchaseMode(value)} className="mt-1 size-4 accent-zinc-900" />
            <span className="flex flex-col">
              <span className="font-semibold text-zinc-900">{title}</span>
              <span className="text-sm text-zinc-600">{body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {purchaseMode === 'automatic' && (
        <TextField label="Hold before sending" suffix="minutes" value={hold} inputMode="numeric" className="max-w-56" onChange={(v) => setHold(v.replace(/\D/g, '').slice(0, 4))} hint="30 is a good balance." />
      )}
      <OutcomeNote outcome={outcome} />
      <button type="submit" disabled={saving} className={cn(primaryButton, 'self-start')}>
        {saving ? 'Saving…' : 'Save tracking settings'}
      </button>
    </form>
  )
}

const staffStore = {
  subscribe: (callback: () => void) => {
    window.addEventListener('hw:staff', callback)
    return () => window.removeEventListener('hw:staff', callback)
  },
  getSnapshot: () => isStaffDevice(),
  getServerSnapshot: () => false,
}

/** Stops this phone or computer counting as a customer: no Pixel, no GA4, no server events, and its orders are test orders. */
export function StaffDeviceToggle() {
  const excluded = useSyncExternalStore(staffStore.subscribe, staffStore.getSnapshot, staffStore.getServerSnapshot)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-700">
        {excluded ? 'This device is excluded: nothing you do on the shop from here counts.' : 'This device counts like a customer’s. Exclude every phone and computer the team uses.'}
      </p>
      <button
        type="button"
        onClick={() => {
          setStaffDevice(!excluded)
          window.dispatchEvent(new Event('hw:staff'))
        }}
        className={cn(excluded ? secondaryButton : primaryButton, 'self-start')}
      >
        {excluded ? 'Count this device again' : 'Exclude this device'}
      </button>
    </div>
  )
}
