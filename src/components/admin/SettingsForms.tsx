'use client'

// The shop settings form and the offer codes list.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@phosphor-icons/react'
import { checkSettings, SETTING_GROUPS, type SettingsDraft } from '@/lib/admin/settings-form'
import { addOfferCode, deleteOfferCode, saveSettings, setAdOffer, setOfferCodeActive, type SettingsResult } from '@/app/admin/(panel)/settings/actions'
import { Card, OutcomeNote, primaryButton, SaveBar, secondaryButton, TextField, type Outcome } from './Fields'

const UNREACHABLE: SettingsResult = { ok: false, message: 'Couldn’t reach the server. Try again.' }

export function SettingsForm({ initial, tierCounts }: { initial: SettingsDraft; tierCounts: Record<string, number> }) {
  const router = useRouter()
  const [d, setD] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const tierKey: Record<string, string> = { offer_tier_high: 'HIGH', offer_tier_mid: 'MID', offer_tier_standard: 'STANDARD' }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        const { problems } = checkSettings(d)
        if (problems.length) return setOutcome({ ok: false, message: problems[0]!, problems })
        setSaving(true)
        setOutcome(null)
        const r = await saveSettings(d).catch(() => UNREACHABLE)
        setSaving(false)
        setOutcome(r)
        if (r.ok) router.refresh()
      }}
    >
      {SETTING_GROUPS.map((g) => (
        <Card key={g.title} title={g.title} intro={g.intro}>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.fields.map((f) => {
              const tier = tierKey[f.key]
              const count = tier ? (tierCounts[tier] ?? 0) : null
              return (
                <TextField
                  key={f.key}
                  label={f.label}
                  prefix={f.kind === 'money' ? '£' : undefined}
                  value={d[f.key]}
                  inputMode={f.kind === 'money' ? 'decimal' : 'numeric'}
                  onChange={(v) => setD((x) => ({ ...x, [f.key]: v }))}
                  hint={[f.hint, count !== null ? `${count} ${count === 1 ? 'product' : 'products'} in this tier.` : null].filter(Boolean).join(' ') || undefined}
                />
              )
            })}
          </div>
        </Card>
      ))}
      <SaveBar saving={saving} label="Save settings" outcome={outcome} />
    </form>
  )
}

export function OfferCodes({ codes }: { codes: { code: string; label: string | null; is_active: boolean }[] }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

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

  return (
    <Card title="Offer codes" intro="A live code gives the order its tier’s amount off at checkout. Codes are letters and numbers, 4 to 24 long. Put the code in your posts, ads or messages wherever you like; the shop itself shows it only to ad visitors.">
      {codes.length > 0 ? (
        <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
          {codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-mono font-semibold text-zinc-900">{c.code}</p>
                <p className="text-sm text-zinc-500">
                  {c.is_active ? 'Live' : 'Off'}
                  {c.label ? ` · ${c.label}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => act(() => setOfferCodeActive(c.code, !c.is_active))} className={secondaryButton}>
                  {c.is_active ? 'Switch off' : 'Switch on'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => window.confirm(`Delete ${c.code}? Orders that used it keep it.`) && act(() => deleteOfferCode(c.code))}
                  className="flex min-h-11 items-center px-3 text-sm font-semibold text-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">No codes yet.</p>
      )}
      <div className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="New code" value={code} maxLength={24} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          <TextField label="Note (staff only)" value={label} maxLength={120} onChange={setLabel} hint="e.g. Instagram, October." />
        </div>
        <button
          type="button"
          disabled={busy || code.length < 4}
          onClick={() =>
            act(
              () => addOfferCode(code, label),
              () => {
                setCode('')
                setLabel('')
              },
            )
          }
          className={`${primaryButton} self-start`}
        >
          <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add code
        </button>
      </div>
      <OutcomeNote outcome={outcome} />
    </Card>
  )
}

export function AdOfferSwitch({ on, days, code }: { on: boolean; days: number; code: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  return (
    <Card
      title="Offer for ad visitors"
      intro={
        <>
          Someone who opens the shop from one of your Meta ads gets their tier’s amount off for {days} {days === 1 ? 'day' : 'days'}, taken off automatically at checkout. The product page, basket and checkout say so, with the real end date.
          {code ? ` They also see the newest live code (${code}) to use on another phone or computer.` : ' Add a live code below so they can use it on another phone or computer too.'}
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-zinc-900">{on ? 'On' : 'Off'}</p>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const r = await setAdOffer(!on).catch(() => UNREACHABLE)
            setBusy(false)
            setOutcome(r)
            if (r.ok) router.refresh()
          }}
          className={secondaryButton}
        >
          {on ? 'Switch off' : 'Switch on'}
        </button>
      </div>
      <OutcomeNote outcome={outcome} />
    </Card>
  )
}
