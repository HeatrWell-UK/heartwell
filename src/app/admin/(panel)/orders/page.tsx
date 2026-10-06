import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon, MagnifyingGlassIcon, PlusIcon, TrayIcon } from '@phosphor-icons/react/ssr'
import { OrderStatusBadge, SOURCE_LABEL, Tag } from '@/components/admin/OrderBits'
import { listOrders, orderOverview, PER_PAGE } from '@/lib/admin/load-orders'
import { dualTime, FILTERS, isFilter, whatsAppTo, type FilterKey } from '@/lib/admin/orders'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Orders' }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ filter?: string; q?: string; page?: string; deleted?: string }> }

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams
  const filter: FilterKey = isFilter(sp.filter) ? sp.filter : 'attention'
  const q = (sp.q ?? '').slice(0, 60)
  const page = /^\d+$/.test(sp.page ?? '') ? Math.max(1, Number(sp.page)) : 1
  const [{ orders, total }, overview] = await Promise.all([listOrders({ filter, q, page }), orderOverview()])
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE))
  const href = (f: FilterKey, p = 1) => {
    const params = new URLSearchParams({ filter: f })
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    return `/admin/orders?${params.toString()}`
  }
  const countFor = (f: FilterKey) => (f === 'attention' ? overview.attention : f === 'all' ? overview.all : f === 'test' ? overview.test : (overview.counts[f] ?? 0))

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {overview.all} real orders · {overview.test} test
          </p>
        </div>
        <Link href="/admin/orders/new" className="flex min-h-11 items-center gap-2 rounded-lg bg-[#140b0e] px-4 text-sm font-semibold text-white hover:text-white">
          <PlusIcon aria-hidden="true" size={18} weight="bold" />
          WhatsApp or phone order
        </Link>
      </header>

      {sp.deleted && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">Test order {sp.deleted} deleted.</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile href={href('attention')} label="Needs attention" value={String(overview.attention)} note="Waiting, confirmed or processing" dark />
        <Tile href={href('attention')} label="To collect" value={formatPrice(overview.openValue)} note="On open orders" />
        <Tile href={href('processing')} label="Processing" value={String(overview.counts.processing ?? 0)} note="Being prepared" />
        <Tile href={href('shipped')} label="On its way" value={String(overview.counts.shipped ?? 0)} note={`${overview.withPreferredDate} open with a preferred day`} />
      </div>

      <form action="/admin/orders" className="flex gap-2" role="search">
        <input type="hidden" name="filter" value={filter} />
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <input
          id="order-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Reference, name, phone, postcode or email"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-[16px] focus:border-zinc-900 focus:outline-none"
        />
        <button type="submit" className="flex min-h-11 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
          <MagnifyingGlassIcon aria-hidden="true" size={18} />
          <span className="sr-only sm:not-sr-only">Search</span>
        </button>
      </form>

      <nav aria-label="Order filters" className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.key} className="shrink-0">
              <Link
                href={href(f.key)}
                aria-current={filter === f.key ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold',
                  filter === f.key ? 'bg-zinc-900 text-white hover:text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:text-zinc-900',
                )}
              >
                {f.label}
                <span className={cn('rounded-full px-1.5 text-xs', filter === f.key ? 'bg-white/15' : 'bg-zinc-100 text-zinc-500')}>{countFor(f.key)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {q && (
        <p className="text-sm text-zinc-600">
          {total} {total === 1 ? 'order matches' : 'orders match'} “{q}” in {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}.{' '}
          <Link href={href(filter)} className="font-semibold text-zinc-900 underline">
            Clear search
          </Link>
        </p>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-12 text-center ring-1 ring-zinc-200">
          <TrayIcon aria-hidden="true" size={40} className="text-zinc-300" />
          <p className="font-semibold">{filter === 'attention' && !q ? 'Nothing needs your attention' : 'No orders here'}</p>
          <p className="text-sm text-zinc-500">{filter === 'attention' && !q ? 'Every order is on its way or done.' : 'Try another filter or search.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const placed = dualTime(o.created_at)
            const items = o.order_items.reduce((n, i) => n + i.quantity, 0)
            // Opens the chat; the ready-written message for each status is on the order's page.
            const wa = whatsAppTo(o.customer_phone)
            return (
              <li key={o.id} className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                <Link href={`/admin/orders/${o.id}`} className="flex flex-col gap-2 p-4 text-zinc-900 hover:text-zinc-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{o.reference}</span>
                    <OrderStatusBadge status={o.status} />
                    {o.source !== 'website' && <Tag tone="source">{SOURCE_LABEL[o.source] ?? o.source}</Tag>}
                    {o.has_made_to_order && <Tag tone="warn">Made to order</Tag>}
                    {o.is_test && <Tag tone="test">Test</Tag>}
                    <CaretRightIcon aria-hidden="true" size={16} className="ml-auto text-zinc-400" />
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-semibold">
                      {o.customer_name} <span className="font-normal text-zinc-500">· {o.postcode}</span>
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums">{formatPrice(o.total_amount)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {items} {items === 1 ? 'item' : 'items'}
                    {placed && ` · placed ${placed.uk} UK · ${placed.pk} PK`}
                    {o.preferred_delivery_date && ` · wants ${o.preferred_delivery_date}`}
                  </p>
                </Link>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center border-t border-zinc-100 text-sm font-semibold text-emerald-700">
                    WhatsApp {o.customer_name.split(/\s+/)[0]}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {lastPage > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={href(filter, page - 1)} className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-zinc-200">
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-zinc-500">
            Page {page} of {lastPage}
          </span>
          {page < lastPage ? (
            <Link href={href(filter, page + 1)} className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-zinc-200">
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}

function Tile({ href, label, value, note, dark }: { href: string; label: string; value: string; note: string; dark?: boolean }) {
  return (
    <Link href={href} className={cn('rounded-xl p-4 shadow-sm', dark ? 'bg-[#140b0e] text-white hover:text-white' : 'bg-white text-zinc-900 ring-1 ring-zinc-200 hover:text-zinc-900')}>
      <span className={cn('block text-xs font-semibold uppercase tracking-wider', dark ? 'text-zinc-400' : 'text-zinc-500')}>{label}</span>
      <span className={cn('mt-1 block text-2xl font-bold tabular-nums', dark && 'text-gold-pale')}>{value}</span>
      <span className={cn('mt-0.5 block text-xs', dark ? 'text-zinc-400' : 'text-zinc-500')}>{note}</span>
    </Link>
  )
}
