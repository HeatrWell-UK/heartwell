'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { saveTrackingSettings } from '@/app/admin/(panel)/tracking/actions'
import { isStaffDevice, setStaffDevice } from '@/lib/tracking/browser'
import type { TrackingMode } from '@/config/tracking'
import { cn } from '@/lib/cn'
import { OutcomeNote, primaryButton, secondaryButton, type Outcome } from './Fields'

const MODES: { value: TrackingMode; title: string; body: string }[] = [
  { value: 'dry_run', title: 'Dry run', body: 'Every event is built and shown below, and nothing is sent anywhere. Safe at any time.' },
  { value: 'test', title: 'Test', body: 'Events go to Meta’s Test events tab and GA4’s checker only. Nothing counts towards ads or reports.' },
  { value: 'live', title: 'Live', body: 'Real events from the live site. Test orders, QA links and staff devices still never count.' },
]

export function TrackingSettingsForm({ initial }: { initial: { mode: TrackingMode } }) {
  const router = useRouter()
  const [mode, setMode] = useState(initial.mode)
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (mode === 'live' && initial.mode !== 'live' && !window.confirm('Switch to Live? Real events will reach Meta and Google from the live site.')) return
        setSaving(true)
        const r = await saveTrackingSettings({ mode }).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
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
      <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
        <strong className="text-zinc-900">Purchases go to Meta and GA4 only when you press a button.</strong> A confirmed order’s Purchase waits in the queue below and on
        its order page until you press Send now (owner, 15 November 2026). Nothing is sent on its own.
      </p>
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
