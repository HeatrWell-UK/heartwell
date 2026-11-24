// Shared pieces for Admin → Website, Journeys and Business (Run 3): the
// period/device/source chips, stat tiles, a funnel with step-to-step rates and
// a small daily bar chart. Server components (plain links and inline SVG), so
// they work on phones and without JavaScript.

import Link from 'next/link'
import { cn } from '@/lib/cn'
import { DEVICES, PERIODS, SOURCES, pct, periodHref, type Period } from '@/lib/admin/period'

const chip = 'flex min-h-9 items-center rounded-full px-3 text-sm font-semibold ring-1'
const on = 'bg-zinc-900 text-white ring-zinc-900'
const off = 'bg-white text-zinc-700 ring-zinc-200 hover:ring-zinc-300'

export function PeriodChips({ base, period, filters = true }: { base: string; period: Period; filters?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.filter((p) => p.key !== 'custom').map((p) => (
          <Link key={p.key} href={periodHref(base, period, { period: p.key })} aria-current={period.key === p.key ? 'page' : undefined} className={cn(chip, period.key === p.key ? on : off)}>
            {p.label}
          </Link>
        ))}
        <form action={base} className="flex flex-wrap items-center gap-1.5 text-sm">
          <input type="hidden" name="period" value="custom" />
          {period.device && <input type="hidden" name="device" value={period.device} />}
          {period.source && <input type="hidden" name="source" value={period.source} />}
          <label className="sr-only" htmlFor={`${base}-from`}>
            From
          </label>
          <input id={`${base}-from`} name="from" type="date" className="min-h-9 rounded-lg px-2 text-sm ring-1 ring-zinc-200" />
          <label className="sr-only" htmlFor={`${base}-to`}>
            To
          </label>
          <input id={`${base}-to`} name="to" type="date" className="min-h-9 rounded-lg px-2 text-sm ring-1 ring-zinc-200" />
          <button type="submit" className={cn(chip, period.key === 'custom' ? on : off)}>
            Custom
          </button>
        </form>
      </nav>
      {filters && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <nav aria-label="Device" className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Device</span>
            {[null, ...DEVICES].map((d) => (
              <Link key={d ?? 'all'} href={periodHref(base, period, { device: d })} className={cn(chip, 'min-h-8 px-2.5 text-xs', period.device === d ? on : off)}>
                {d ?? 'All'}
              </Link>
            ))}
          </nav>
          <nav aria-label="Source" className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Source</span>
            {[null, ...SOURCES].map((s) => (
              <Link key={s ?? 'all'} href={periodHref(base, period, { source: s })} className={cn(chip, 'min-h-8 px-2.5 text-xs', period.source === s ? on : off)}>
                {s ?? 'All'}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <p className="text-sm text-zinc-500">
        {period.label} (UK time){period.device ? ` · ${period.device}` : ''}
        {period.source ? ` · ${period.source}` : ''} · test orders and staff devices excluded
      </p>
    </div>
  )
}

export function Stat({ label, value, note, tone = 'plain' }: { label: string; value: string | number; note?: string; tone?: 'plain' | 'good' | 'warn' }) {
  return (
    <div className={cn('flex flex-col gap-0.5 rounded-xl bg-white p-4 ring-1 ring-zinc-200', tone === 'good' && 'ring-emerald-200', tone === 'warn' && 'ring-amber-200')}>
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-zinc-900">{value}</span>
      {note && <span className="text-xs text-zinc-500">{note}</span>}
    </div>
  )
}

export function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200 lg:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {intro && <p className="text-sm text-zinc-500">{intro}</p>}
      </div>
      {children}
    </section>
  )
}

export interface FunnelStep {
  key: string
  label: string
  sessions: number
}

/** Each step as a bar against the first, with the rate from the step before and, if given, the prior period. */
export function Funnel({ steps, prior }: { steps: FunnelStep[]; prior?: FunnelStep[] }) {
  const top = steps[0]?.sessions ?? 0
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((s, i) => {
        const before = i > 0 ? steps[i - 1]!.sessions : s.sessions
        const was = prior?.find((p) => p.key === s.key)?.sessions
        return (
          <li key={s.key} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="font-medium text-zinc-800">
                {i + 1}. {s.label}
              </span>
              <span className="tabular-nums text-zinc-600">
                <strong className="text-zinc-900">{s.sessions}</strong>
                {i > 0 && <> · {pct(s.sessions, before)} of step {i}</>}
                {was !== undefined && <span className="text-zinc-400"> · before: {was}</span>}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
              <div className="h-full rounded-full bg-[#8E1B2E]" style={{ width: top > 0 ? `${Math.max(2, (s.sessions / top) * 100)}%` : '0%' }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A daily bar chart of one series, with a table for screen readers. */
export function DailyBars({ rows, series, label }: { rows: Record<string, number | string>[]; series: string; label: string }) {
  const values = rows.map((r) => Number(r[series] ?? 0))
  const max = Math.max(1, ...values)
  const w = Math.max(rows.length, 1)
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${w * 10} 60`} preserveAspectRatio="none" className="h-28 w-full" role="img" aria-label={`${label} by day`}>
        {values.map((v, i) => (
          <rect key={i} x={i * 10 + 1} y={60 - (v / max) * 56} width={8} height={(v / max) * 56} rx={1.5} fill="#8E1B2E" opacity={v ? 1 : 0.15}>
            <title>{`${rows[i]!.day}: ${v}`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="flex justify-between text-xs text-zinc-500">
        <span>{String(rows[0]?.day ?? '')}</span>
        <span>
          {label}: {values.reduce((a, b) => a + b, 0)} in all, most in a day {Math.max(0, ...values)}
        </span>
        <span>{String(rows.at(-1)?.day ?? '')}</span>
      </figcaption>
    </figure>
  )
}

export function KeyTable({ rows, head }: { rows: (string | number)[][]; head: string[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">Nothing in this period yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            {head.map((h, i) => (
              <th key={h} className={cn('py-2 pr-3 font-semibold', i > 0 && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-zinc-100 last:border-0">
              {r.map((c, j) => (
                <td key={j} className={cn('py-2 pr-3', j > 0 ? 'text-right tabular-nums' : 'break-all text-zinc-800')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
