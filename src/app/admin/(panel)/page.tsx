import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { loadStatus } from '@/lib/admin/load-status'
import { overallLevel } from '@/lib/admin/status'

export const metadata: Metadata = { title: 'Home' }
export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const { data, checks } = await loadStatus()
  const overall = overallLevel(checks)

  const tiles = [
    { label: 'Waiting to confirm', value: data?.orders.awaiting_confirmation ?? 0 },
    { label: 'Real orders', value: data?.orders.real ?? 0 },
    { label: 'Products on sale', value: data?.catalogue.active_products ?? 0 },
    { label: 'Test orders', value: data?.orders.test ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-6 lg:gap-10">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Overview</h1>
        <p className="mt-1 text-[15px] text-zinc-500">Orders, products and the health of the shop.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={
              i === 0
                ? 'rounded-xl bg-[#140b0e] p-5 shadow-lg lg:p-6'
                : 'rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:p-6'
            }
          >
            <p className={i === 0 ? 'text-xs font-semibold uppercase tracking-wider text-zinc-400' : 'text-xs font-semibold uppercase tracking-wider text-zinc-500'}>
              {t.label}
            </p>
            <p className={i === 0 ? 'mt-2 text-3xl font-bold text-gold-pale' : 'mt-2 text-3xl font-bold text-zinc-900'}>{t.value}</p>
          </div>
        ))}
      </div>

      <Link
        href="/admin/status"
        className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-zinc-300"
      >
        <span className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-900">Status</span>
          <span className="text-sm text-zinc-500">Database, email, scheduled jobs, tracking and OrderFlow</span>
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge level={overall} label={overall === 'warn' ? 'Partly set up' : undefined} />
          <CaretRightIcon aria-hidden="true" size={18} className="text-zinc-400" />
        </span>
      </Link>
    </div>
  )
}
