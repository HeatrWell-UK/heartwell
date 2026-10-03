import type { Metadata } from 'next'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { loadStatus } from '@/lib/admin/load-status'
import { overallLevel } from '@/lib/admin/status'

export const metadata: Metadata = { title: 'Status' }
export const dynamic = 'force-dynamic'

const HEADLINE = {
  ok: 'Everything is working.',
  warn: 'Working. Some parts aren’t set up yet.',
  error: 'Something needs attention.',
} as const

export default async function StatusPage() {
  const { checks } = await loadStatus()
  const overall = overallLevel(checks)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Status</h1>
        <p className="flex flex-wrap items-center gap-2 text-[15px] text-zinc-600">
          <StatusBadge level={overall} label={overall === 'warn' ? 'Partly set up' : undefined} />
          {HEADLINE[overall]}
        </p>
      </header>

      <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {checks.map((check) => (
          <li key={check.key} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-900">{check.title}</h2>
              <StatusBadge level={check.level} />
            </div>
            <p className="text-[15px] leading-snug text-zinc-700">{check.summary}</p>
            {check.details && check.details.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-sm">
                {check.details.map((d) => (
                  <div key={d.label} className="contents">
                    <dt className="text-zinc-500">{d.label}</dt>
                    <dd className="break-words text-zinc-800">{d.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
