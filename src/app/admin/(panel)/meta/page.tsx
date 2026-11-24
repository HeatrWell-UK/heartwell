import type { Metadata } from 'next'
import Link from 'next/link'
import { OrderStatusBadge, Tag } from '@/components/admin/OrderBits'
import { createClient } from '@/lib/supabase/server'
import { dualTime } from '@/lib/admin/workstation'
import { purchaseWindow, purchaseWindowText } from '@/lib/tracking/purchase-window'
import { formatPrice } from '@/lib/format'

export const metadata: Metadata = { title: 'Meta signals' }
export const dynamic = 'force-dynamic'

// Admin → Meta signals (Run 4): the Purchase and OrderDelivered ledger from
// conversion_outbox with each order's state, staff verification, consent,
// source evidence, Meta's 7-day window and Meta's own receipt. Read-only:
// Send / Hold / Don't send stay on the order page, where the server checks
// eligibility again. A Purchase goes only for a staff-verified, consented,
// genuine order within 7 days; sent events can't be withdrawn.

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const EVENTS = ['all', 'Purchase', 'OrderDelivered'] as const
const STATUSES = ['all', 'sent', 'pending', 'held', 'failed', 'skipped'] as const

interface Row {
  id: string
  event_name: string
  status: string
  sent_at: string | null
  skip_reason: string | null
  error: string | null
  response: unknown
  created_at: string
  order: {
    id: string
    reference: string | null
    status: string
    total_amount: number
    confirmed_at: string | null
    confirmed_by: string | null
    staff_verified_at: string | null
    tracking_consent: string | null
    is_test: boolean
    fbclid: string | null
    utm_source: string | null
    manual_acquisition_source: string | null
  } | null
}

function received(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const r = response as Record<string, unknown>
  const n = r.events_received ?? (r.body as Record<string, unknown> | undefined)?.events_received
  return typeof n === 'number' ? `Meta received ${n}` : null
}

export default async function MetaSignalsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const event = (EVENTS as readonly string[]).includes(one(params.event)) ? one(params.event) : 'all'
  const status = (STATUSES as readonly string[]).includes(one(params.status)) ? one(params.status) : 'all'
  const q = one(params.q).trim().toUpperCase().slice(0, 30)
  const db = await createClient()
  const { data, error } = await db
    .from('conversion_outbox')
    .select(
      'id, event_name, status, sent_at, skip_reason, error, response, created_at, order:orders(id, reference, status, total_amount, confirmed_at, confirmed_by, staff_verified_at, tracking_consent, is_test, fbclid, utm_source, manual_acquisition_source)',
    )
    .eq('platform', 'meta')
    .order('created_at', { ascending: false })
    .range(0, 1999)
  if (error) throw new Error(`Meta signals: ${error.message}`)
  const all = (data ?? []) as unknown as Row[]
  const rows = all.filter((r) => (event === 'all' || r.event_name === event) && (status === 'all' || r.status === status) && (!q || (r.order?.reference ?? '').includes(q)))
  const count = (s: string) => all.filter((r) => (event === 'all' || r.event_name === event) && r.status === s).length
  const sentCancelled = all.filter((r) => r.status === 'sent' && r.event_name === 'Purchase' && r.order && (r.order.status === 'cancelled' || !r.order.staff_verified_at))
  const link = (change: Record<string, string>) => {
    const s = new URLSearchParams({ ...(event !== 'all' ? { event } : {}), ...(status !== 'all' ? { status } : {}), ...(q ? { q } : {}), ...change })
    for (const [k, v] of [...s.entries()]) if (v === 'all' || !v) s.delete(k)
    const str = s.toString()
    return str ? `/admin/meta?${str}` : '/admin/meta'
  }
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${on ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200 hover:ring-zinc-300'}`

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Meta signals</h1>
        <p className="text-[15px] text-zinc-600">
          Purchase and delivery events for Meta. A Purchase goes only after <strong>staff verification</strong>, with advertising consent, within Meta’s 7 days, once. Skipped rows
          (no consent, test, cancelled, too old) aren’t waiting for anything. Send, Hold and Don’t send are on each order, where the server checks again.
        </p>
        <nav aria-label="Event" className="flex flex-wrap gap-1.5">
          {EVENTS.map((e) => (
            <Link key={e} href={link({ event: e })} className={chip(event === e)}>
              {e === 'all' ? 'All' : e === 'OrderDelivered' ? 'Delivered' : e}
            </Link>
          ))}
        </nav>
        <nav aria-label="Status" className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Link key={s} href={link({ status: s })} className={chip(status === s)}>
              {s === 'all' ? 'All' : s[0]!.toUpperCase() + s.slice(1)} {s !== 'all' && <span className="tabular-nums">{count(s)}</span>}
            </Link>
          ))}
        </nav>
        <form action="/admin/meta" className="flex flex-wrap gap-2">
          {event !== 'all' && <input type="hidden" name="event" value={event} />}
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="meta-q" className="sr-only">
            Search by order reference
          </label>
          <input id="meta-q" name="q" defaultValue={q} placeholder="HW-100…" className="min-h-10 rounded-lg px-3 text-[16px] ring-1 ring-zinc-300" />
          <button type="submit" className="min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </header>

      {sentCancelled.length > 0 && (
        <p role="note" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          {sentCancelled.length} Purchase {sentCancelled.length === 1 ? 'event was' : 'events were'} sent before staff verification became the rule, or for orders since cancelled. Meta
          can’t take them back, and nothing is resent or “corrected” to make up for them.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <th className="p-3">Order</th>
              <th className="p-3">Event</th>
              <th className="p-3">Signal</th>
              <th className="p-3">Order state</th>
              <th className="p-3">Verified</th>
              <th className="p-3">Consent</th>
              <th className="p-3">Source evidence</th>
              <th className="p-3">Window / receipt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const o = r.order
              const w = purchaseWindow(o?.confirmed_at, new Date())
              return (
                <tr key={r.id} className="border-b border-zinc-100 align-top last:border-0">
                  <td className="p-3">
                    {o ? (
                      <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold">
                        {o.reference}
                      </Link>
                    ) : (
                      '—'
                    )}
                    <div className="text-xs text-zinc-500">{dualTime(r.created_at)}</div>
                  </td>
                  <td className="p-3">{r.event_name}</td>
                  <td className="p-3">
                    <Tag tone={r.status === 'failed' || r.status === 'held' ? 'warn' : 'plain'}>{r.status}</Tag>
                    {r.skip_reason && <div className="mt-1 max-w-[16rem] text-xs text-zinc-500">{r.skip_reason}</div>}
                    {r.error && <div className="mt-1 max-w-[16rem] text-xs text-red-700">{r.error.slice(0, 140)}</div>}
                  </td>
                  <td className="p-3">
                    {o && <OrderStatusBadge status={o.status} />}
                    {o && <div className="mt-1 text-xs text-zinc-500">{formatPrice(Number(o.total_amount))}</div>}
                  </td>
                  <td className="p-3">{o?.staff_verified_at ? 'Yes' : o?.confirmed_by === 'customer' ? 'Customer only' : 'No'}</td>
                  <td className="p-3">{o?.tracking_consent ?? 'unknown'}</td>
                  <td className="p-3">{o?.fbclid ? 'Meta click' : o?.utm_source ? `Tag: ${o.utm_source}` : o?.manual_acquisition_source ? `Staff: ${o.manual_acquisition_source}` : 'Unknown'}</td>
                  <td className="p-3 text-xs">
                    {r.status === 'sent' ? (received(r.response) ?? 'Sent') + (r.sent_at ? ` · ${dualTime(r.sent_at)}` : '') : w ? purchaseWindowText(w) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-zinc-600">Nothing matches these filters.</p>}
      </div>
    </div>
  )
}
