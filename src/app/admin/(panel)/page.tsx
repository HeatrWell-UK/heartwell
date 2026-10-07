import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon, PlusIcon } from '@phosphor-icons/react/ssr'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { OrderStatusBadge, Tag } from '@/components/admin/OrderBits'
import { loadStatus } from '@/lib/admin/load-status'
import { overallLevel } from '@/lib/admin/status'
import { listOrders, orderOverview } from '@/lib/admin/load-orders'
import { leadCounts } from '@/lib/admin/load-leads'
import { createClient } from '@/lib/supabase/server'
import { dualTime } from '@/lib/admin/orders'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Home' }
export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const [{ data, checks }, overview, recent, leads, reviews] = await Promise.all([
    loadStatus(),
    orderOverview(),
    listOrders({ filter: 'all', q: '', page: 1 }),
    leadCounts(),
    createClient().then((db) => db.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false)),
  ])
  const waiting = [
    { label: 'samples to post', count: leads.samples, href: '/admin/leads?tab=samples' },
    { label: 'messages', count: leads.messages, href: '/admin/leads?tab=messages' },
    { label: 'reviews to check', count: reviews.count ?? 0, href: '/admin/reviews' },
    { label: 'basket reminders', count: leads.baskets, href: '/admin/leads?tab=baskets' },
  ].filter((w) => w.count > 0)
  const overall = overallLevel(checks)
  // The Health card: what needs fixing, in the Status page's words. It grows as tracking and jobs arrive (Phases 14 and 17).
  const problems = checks.filter((c) => c.level !== 'ok')

  const tiles = [
    { label: 'Needs attention', value: String(overview.attention), href: '/admin/orders?filter=attention' },
    { label: 'Waiting to confirm', value: String(overview.counts.pending_cod ?? 0), href: '/admin/orders?filter=pending_cod' },
    { label: 'To collect', value: formatPrice(overview.openValue), href: '/admin/orders?filter=attention' },
    { label: 'Products on sale', value: String(data?.catalogue.active_products ?? 0), href: '/admin/catalogue' },
  ]

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Overview</h1>
          <p className="mt-1 text-[15px] text-zinc-500">Orders, products and the health of the shop.</p>
        </div>
        <Link href="/admin/orders/new" className="flex min-h-11 items-center gap-2 rounded-lg bg-[#140b0e] px-4 text-sm font-semibold text-white hover:text-white">
          <PlusIcon aria-hidden="true" size={18} weight="bold" />
          WhatsApp or phone order
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {tiles.map((t, i) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn('rounded-xl p-5 lg:p-6', i === 0 ? 'bg-[#140b0e] text-white shadow-lg hover:text-white' : 'border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:text-zinc-900')}
          >
            <span className={cn('block text-xs font-semibold uppercase tracking-wider', i === 0 ? 'text-zinc-400' : 'text-zinc-500')}>{t.label}</span>
            <span className={cn('mt-2 block text-3xl font-bold tabular-nums', i === 0 && 'text-gold-pale')}>{t.value}</span>
          </Link>
        ))}
      </div>

      {waiting.length > 0 && (
        <section aria-label="Waiting for you" className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-sm font-semibold text-amber-950">Waiting for you:</span>
          {waiting.map((w) => (
            <Link key={w.href} href={w.href} className="flex min-h-10 items-center rounded-full bg-white px-3.5 text-sm font-semibold text-zinc-900 ring-1 ring-amber-200 hover:text-zinc-900">
              {w.count} {w.label}
            </Link>
          ))}
        </section>
      )}

      <section aria-labelledby="health" className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 id="health" className="font-semibold">
            Health
          </h2>
          <StatusBadge level={overall} label={overall === 'warn' ? 'Partly set up' : undefined} />
        </div>
        {problems.length === 0 ? (
          <p className="text-sm text-zinc-600">Everything is working.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {problems.map((c) => (
              <li key={c.key} className="flex items-start gap-2">
                <StatusBadge level={c.level} />
                <span>
                  <strong className="font-semibold">{c.title}:</strong> {c.summary}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/status" className="flex items-center gap-1 self-start text-sm font-semibold text-zinc-700">
          All checks <CaretRightIcon aria-hidden="true" size={14} />
        </Link>
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent" className="font-semibold">
            Latest orders
          </h2>
          <Link href="/admin/orders?filter=all" className="text-sm font-semibold text-zinc-700">
            All orders
          </Link>
        </div>
        {recent.orders.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-zinc-600 ring-1 ring-zinc-200">No orders yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
            {recent.orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-zinc-900 hover:bg-zinc-50 hover:text-zinc-900">
                  <span className="font-mono text-sm font-semibold">{o.reference}</span>
                  <OrderStatusBadge status={o.status} />
                  {o.is_test && <Tag tone="test">Test</Tag>}
                  <span className="text-sm">{o.customer_name}</span>
                  <span className="ml-auto font-semibold tabular-nums">{formatPrice(o.total_amount)}</span>
                  <span className="basis-full text-xs text-zinc-500">{dualTime(o.created_at)?.uk} UK · {dualTime(o.created_at)?.pk} PK</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
