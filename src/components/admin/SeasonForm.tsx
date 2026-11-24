'use client'

// Admin → Settings: the Christmas and New Year season (Run 3). On or off, the
// season's start and end in UK time, the length of each visitor's window, and
// "new generation" (everyone gets one fresh window). The figures beside it come
// from the database: windows given, live and ended, and what's covered.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSeason } from '@/app/admin/(panel)/settings/season-actions'
import { checkSeason, seasonDraft, type SeasonStatus } from '@/lib/admin/season-form'
import { Card, OutcomeNote, primaryButton, TextField, Toggle, type Outcome } from './Fields'

const when = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

export function SeasonForm({ status }: { status: SeasonStatus }) {
  const router = useRouter()
  const [d, setD] = useState(() => seasonDraft(status))
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))

  return (
    <Card
      id="season"
      title="Christmas and New Year season"
      intro={
        <>
          £{Math.round(status.amount)} off each sofa and chair, one window per visitor (new or returning) from their first visit, never past the end. The welcome and
          ad offers pause while it’s on and come back afterwards. Codes CHRISTMAS and NEWYEAR are labels only: they add nothing.
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {(
          [
            ['Now', status.live_now ? 'Live' : status.enabled ? 'Not in its dates' : 'Off'],
            ['Windows given', status.windows_this_generation],
            ['Live windows', status.windows_live],
            ['Ended windows', status.windows_ended],
            ['Pieces covered', status.eligible_products],
            ['Left out', status.excluded_products.join(', ') || 'None'],
            ['Generation', status.generation],
            ['Archived', status.archived],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex flex-col rounded-lg bg-zinc-50 px-3 py-2">
            <dt className="text-xs text-zinc-500">{k}</dt>
            <dd className="break-words font-semibold text-zinc-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-zinc-600">
        Runs {when(status.starts_at)} to {when(status.ends_at)} (UK time).
      </p>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const { problems } = checkSeason(d)
          if (problems.length) return setOutcome({ ok: false, message: problems[0]!, problems })
          if (d.newGeneration && !window.confirm('Give every visitor one fresh window? Windows that have ended will start again on their next visit.')) return
          setSaving(true)
          setOutcome(null)
          const r = await saveSeason(d).catch(() => ({ ok: false, message: 'Couldn’t reach the server. Try again.' }))
          setSaving(false)
          setOutcome(r)
          if (r.ok) {
            set('newGeneration', false)
            router.refresh()
          }
        }}
      >
        <Toggle label="Season on" checked={d.enabled} onChange={(v) => set('enabled', v)} hint="Off stops new windows and takes the £50 off the shop and checkout straight away." />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Starts (UK time)" type="datetime-local" value={d.startsLocal} onChange={(v) => set('startsLocal', v)} />
          <TextField label="Ends (UK time)" type="datetime-local" value={d.endsLocal} onChange={(v) => set('endsLocal', v)} hint="1 Feb 00:00 ends it after 31 January." />
          <TextField label="Each visitor’s window" inputMode="decimal" value={d.windowDays} onChange={(v) => set('windowDays', v)} suffix="days" />
        </div>
        <Toggle
          label="New generation"
          checked={d.newGeneration}
          onChange={(v) => set('newGeneration', v)}
          hint="Every visitor gets one fresh window on their next visit. Use it only for a new campaign: it restarts ended windows."
        />
        <div>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Saving…' : 'Save the season'}
          </button>
        </div>
        <OutcomeNote outcome={outcome} />
      </form>
    </Card>
  )
}
