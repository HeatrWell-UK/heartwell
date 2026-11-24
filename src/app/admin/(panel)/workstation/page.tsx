import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { OrderStatusBadge, Tag } from '@/components/admin/OrderBits'
import { createClient } from '@/lib/supabase/server'
import { dualTime, filterItems, GROUP_ORDER, GROUP_TITLE, KIND_LABEL, workstationItems, type WorkItem, type WorkKind, type WsOrder } from '@/lib/admin/workstation'
import { todaySince } from '@/lib/admin/today'
import { purchaseWindowText } from '@/lib/tracking/purchase-window'
import { formatPrice } from '@/lib/format'

export const metadata: Metadata = { title: 'Workstation' }
export const dynamic = 'force-dynamic'

// Admin → Workstation (Run 4): every open task, grouped and filterable, each
// opening the guarded record. Nothing is sent or verified from here. Read with
// the admin's own session; a failed read shows an error, never a silent zero.

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function WorkstationPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const kind = (Object.keys(KIND_LABEL) as WorkKind[]).includes(one(params.type) as WorkKind) ? one(params.type) : null
  const q = one(params.q).slice(0, 60) || null
  const db = await createClient()
  const since = todaySince()
  const [orders, signals, contacts, samples, baskets] = await Promise.all([
    db
      .from('orders')
      .select('id, reference, customer_name, status, created_at, confirmed_at, confirmed_by, staff_verified_at, held_at, hold_reason, preferred_delivery_date, total_amount, is_test, fbclid, gclid, gbraid, wbraid, utm_source, manual_acquisition_source')
      .eq('is_test', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(0, 1999),
    db.from('conversion_outbox').select('order_id, event_name, status, sent_at, skip_reason').eq('platform', 'meta').gte('created_at', since).range(0, 3999),
    db.from('contact_messages').select('id, created_at, topic').eq('status', 'new').eq('is_test', false).range(0, 499),
    db.from('sample_requests').select('id, created_at').eq('status', 'pending').eq('is_test', false).range(0, 499),
    db.from('basket_reminder_leads').select('id, created_at').eq('status', 'active').eq('is_test', false).is('reminder_sent_at', null).range(0, 499),
  ])
  const failed = [orders, signals, contacts, samples, baskets].find((r) => r.error)
  if (failed?.error) throw new Error(`Workstation: ${failed.error.message}`)

  const rows: WsOrder[] = (orders.data ?? []).map((o) => ({
    ...o,
    total_amount: Number(o.total_amount),
    has_source: Boolean(o.fbclid || o.gclid || o.gbraid || o.wbraid || o.utm_source || o.manual_acquisition_source),
  }))
  const totals = new Map(rows.map((o) => [o.id, o]))
  const all = workstationItems({
    orders: rows,
    signals: signals.data ?? [],
    leads: [
      ...(contacts.data ?? []).map((c) => ({ id: c.id, kind: 'contact_message' as const, created_at: c.created_at, label: `Contact: ${c.topic ?? 'message'}` })),
      ...(samples.data ?? []).map((s) => ({ id: s.id, kind: 'sample_request' as const, created_at: s.created_at, label: 'Fabric samples' })),
      ...(baskets.data ?? []).map((b) => ({ id: b.id, kind: 'basket_reminder' as const, created_at: b.created_at, label: 'Basket reminder' })),
    ],
  })
  const items = filterItems(all, kind, q)
  const counts = new Map<string, number>()
  for (const i of all) if (i.group !== 'done') counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1)

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${on ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200 hover:ring-zinc-300'}`
  const href = (t: string | null) => {
    const s = new URLSearchParams()
    if (t) s.set('type', t)
    if (q) s.set('q', q)
    const str = s.toString()
    return str ? `/admin/workstation?${str}` : '/admin/workstation'
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Workstation</h1>
        <p className="text-[15px] text-zinc-600">
          Every open task from the last 60 days, grouped by what it needs. Each row opens the record where the real action is: Verify, Send Purchase and Hold live on the order,
          never here. A customer’s own Confirm is not a verified sale.
        </p>
        <form action="/admin/workstation" className="flex flex-wrap gap-2">
          {kind && <input type="hidden" name="type" value={kind} />}
          <label htmlFor="ws-q" className="sr-only">
            Search by order reference or name
          </label>
          <input id="ws-q" name="q" defaultValue={q ?? ''} placeholder="HW-100… or name" className="min-h-10 min-w-0 flex-1 rounded-lg px-3 text-[16px] ring-1 ring-zinc-300 sm:max-w-xs" />
          <button type="submit" className="min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
        <nav aria-label="Task type" className="flex flex-wrap gap-1.5">
          <Link href={href(null)} className={chip(!kind)}>
            All open <span className="tabular-nums">{all.filter((i) => i.group !== 'done').length}</span>
          </Link>
          {[...counts.entries()].map(([k, n]) => (
            <Link key={k} href={href(k)} className={chip(kind === k)}>
              {KIND_LABEL[k as WorkKind]} <span className="tabular-nums">{n}</span>
            </Link>
          ))}
        </nav>
      </header>

      {GROUP_ORDER.map((g) => {
        const list = items.filter((i) => i.group === g)
        if (list.length === 0) return null
        return (
          <section key={g} aria-labelledby={`ws-${g}`} className="flex flex-col gap-2">
            <h2 id={`ws-${g}`} className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
              {GROUP_TITLE[g]} <Tag tone={g === 'urgent' ? 'warn' : 'plain'}>{list.length}</Tag>
            </h2>
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
              {list.map((i) => (
                <Row key={i.key} item={i} order={totals.get(i.href.split('/').pop() ?? '')} />
              ))}
            </ul>
          </section>
        )
      })}
      {items.length === 0 && <p className="rounded-xl bg-white p-6 text-[15px] text-zinc-600 ring-1 ring-zinc-200">Nothing matches. Clear the filter to see every task.</p>}
    </div>
  )
}

function Row({ item, order }: { item: WorkItem; order?: WsOrder }) {
  return (
    <li>
      <Link href={item.href} className="flex items-center gap-3 p-4 text-zinc-900 hover:bg-zinc-50">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <Tag tone={item.group === 'urgent' ? 'warn' : 'plain'}>{KIND_LABEL[item.kind]}</Tag>
            <span className="text-sm font-semibold">{item.title}</span>
            {order && <span className="text-sm text-zinc-600">{formatPrice(order.total_amount)}</span>}
            {order && <OrderStatusBadge status={order.status} />}
          </span>
          <span className="text-sm text-zinc-600">{item.why}</span>
          <span className="text-xs text-zinc-500">
            {dualTime(item.at)}
            {item.window && <span className={item.window.urgent || item.window.expired ? ' font-semibold text-amber-800' : ''}> · {purchaseWindowText(item.window)}</span>}
          </span>
        </span>
        <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  )
}
