'use client'

// Admin → Settings: where delivery costs extra, and the days nothing is
// delivered (owner, 17 October 2026).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@phosphor-icons/react'
import { formatPrice } from '@/lib/format'
import { areaDraft, checkArea, EMPTY_AREA, WEEKDAYS, type AreaDraft, type AreaRow } from '@/lib/admin/delivery-areas-form'
import { deleteDeliveryArea, saveDeliveryArea, saveNoDeliveryDays, type SettingsResult } from '@/app/admin/(panel)/settings/actions'
import { Card, OutcomeNote, primaryButton, secondaryButton, TextArea, TextField, Toggle, type Outcome } from './Fields'

const UNREACHABLE: SettingsResult = { ok: false, message: 'Couldn’t reach the server. Try again.' }

export function DeliveryAreasForm({ areas, noDeliveryDays }: { areas: AreaRow[]; noDeliveryDays: number[] }) {
  const [adding, setAdding] = useState(false)
  return (
    <Card
      title="Delivery areas"
      intro="Delivery is free everywhere on the mainland except these areas, which pay their charge and take longer. Each area is a list of postcode districts: the first half of a postcode, like EX4 or IV2. The charge is added at checkout as soon as the customer enters their postcode; islands and Northern Ireland still go to a quote."
    >
      <ul className="flex flex-col gap-2">
        {areas.map((a) => (
          <li key={a.slug}>
            <AreaEditor area={a} />
          </li>
        ))}
      </ul>
      {adding ? (
        <AreaEditor area={null} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${secondaryButton} self-start`}>
          <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add an area
        </button>
      )}
      <NoDeliveryDays initial={noDeliveryDays} />
    </Card>
  )
}

function AreaEditor({ area, onDone }: { area: AreaRow | null; onDone?: () => void }) {
  const router = useRouter()
  const [draft, setDraft] = useState<AreaDraft>(area ? areaDraft(area) : EMPTY_AREA)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const set = (patch: Partial<AreaDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const isNew = area === null

  async function act(run: () => Promise<SettingsResult>, after?: () => void) {
    setBusy(true)
    const r = await run().catch(() => UNREACHABLE)
    setBusy(false)
    setOutcome(r)
    if (r.ok) {
      after?.()
      router.refresh()
    }
  }

  const save = () => {
    const { problems } = checkArea(draft)
    if (problems.length) return setOutcome({ ok: false, message: problems[0]!, problems })
    void act(() => saveDeliveryArea(draft, isNew), onDone)
  }

  const fields = (
    <div className="flex flex-col gap-3 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" value={draft.name} maxLength={60} onChange={(name) => set({ name })} hint="Customers see it, e.g. Devon." />
        <TextField label="Charge" value={draft.charge} prefix="£" inputMode="decimal" onChange={(charge) => set({ charge })} />
        <TextField label="Quickest delivery" value={draft.minDays} inputMode="numeric" suffix="working days" onChange={(minDays) => set({ minDays })} />
        <TextField label="Slowest delivery" value={draft.maxDays} inputMode="numeric" suffix="working days" onChange={(maxDays) => set({ maxDays })} />
      </div>
      <TextField label="Towns" value={draft.places} maxLength={200} onChange={(places) => set({ places })} hint="Shown on Delivery and returns, e.g. Exeter, Plymouth, Torquay." />
      <TextArea
        label="Postcode districts"
        value={draft.districts}
        rows={4}
        onChange={(districts) => set({ districts })}
        hint="Separated by commas or spaces, e.g. EX1, EX2, TQ1."
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={save} className={primaryButton}>
          {isNew ? 'Add area' : 'Save'}
        </button>
        {isNew ? (
          <button type="button" disabled={busy} onClick={onDone} className={secondaryButton}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => window.confirm(`Delete ${area.name}? Delivery there becomes free.`) && act(() => deleteDeliveryArea(area.slug))}
            className="flex min-h-11 items-center px-3 text-sm font-semibold text-red-700"
          >
            Delete
          </button>
        )}
      </div>
      <OutcomeNote outcome={outcome} />
    </div>
  )

  if (isNew) return <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">{fields}</div>
  return (
    <details className="rounded-lg p-3 ring-1 ring-zinc-200">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-zinc-900">{area.name}</span>
        <span className="text-sm text-zinc-600">
          {formatPrice(area.charge)} · {area.min_working_days} to {area.max_working_days} working days · {area.districts.length} districts
        </span>
      </summary>
      {fields}
    </details>
  )
}

function NoDeliveryDays({ initial }: { initial: number[] }) {
  const router = useRouter()
  const [days, setDays] = useState<number[]>(initial)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
      <p className="text-sm font-semibold text-zinc-800">No deliveries on</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {WEEKDAYS.map((name, i) => (
          <Toggle
            key={name}
            label={name}
            checked={days.includes(i + 1)}
            onChange={(on) => setDays((d) => (on ? [...d, i + 1] : d.filter((x) => x !== i + 1)))}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          const r = await saveNoDeliveryDays(days).catch(() => UNREACHABLE)
          setBusy(false)
          setOutcome(r)
          if (r.ok) router.refresh()
        }}
        className={`${secondaryButton} self-start`}
      >
        Save delivery days
      </button>
      <OutcomeNote outcome={outcome} />
    </div>
  )
}
