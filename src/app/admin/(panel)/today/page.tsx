import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { OrderStatusBadge, Tag } from '@/components/admin/OrderBits'
import { createClient } from '@/lib/supabase/server'
import { sourceReviewSince, TASK_ORDER, TASK_TITLE, todaySince, todayTasks, type TodayOrder, type TodayTask } from '@/lib/admin/today'
import { purchaseWindowText } from '@/lib/tracking/purchase-window'
import { formatPrice } from '@/lib/format'

export const metadata: Metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

// Admin → Today (Run 2): the jobs to do now, most urgent first, each opening
// the real order where the protected actions are (WhatsApp details, Mark
// confirmed, Verify, Send Purchase, Hold). Read with the admin's own session,
// so the database's admin checks apply.

export default async function TodayPage() {
  const db = await createClient()
  const since = todaySince()
  const reviewSince = sourceReviewSince()
  const [orders, purchases, unsourced] = await Promise.all([
    db
      .from('orders')
      .select('id, reference, customer_name, status, created_at, confirmed_at, confirmed_by, staff_verified_at, held_at, hold_reason, preferred_delivery_date, total_amount, is_test')
      .in('status', ['pending_cod', 'confirmed', 'delivered'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    db.from('conversion_outbox').select('order_id, status').eq('platform', 'meta').eq('event_name', 'Purchase').in('status', ['held', 'failed', 'pending']),
    // Source review (Run 3): real orders in the last 30 days with no evidence of where they came from and no staff answer yet.
    db
      .from('orders')
      .select('id, reference, customer_name, status, created_at, whatsapp_reference, visitor_id')
      .eq('is_test', false)
      .neq('status', 'cancelled')
      .gte('created_at', reviewSince)
      .is('fbclid', null)
      .is('gclid', null)
      .is('gbraid', null)
      .is('wbraid', null)
      .is('utm_source', null)
      .is('manual_acquisition_source', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  if (orders.error) throw new Error(`Today: ${orders.error.message}`)
  if (purchases.error) throw new Error(`Today: ${purchases.error.message}`)
  if (unsourced.error) throw new Error(`Today: ${unsourced.error.message}`)
  const tasks = todayTasks(
    (orders.data ?? []).map((r) => ({ ...r, total_amount: Number(r.total_amount) }) as TodayOrder),
    (purchases.data ?? []).map((p) => ({ orderId: p.order_id, status: p.status })),
  )
  const groups = TASK_ORDER.map((kind) => ({ kind, items: tasks.filter((t) => t.kind === kind) })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Today</h1>
        <p className="mt-1 text-[15px] text-zinc-500">
          What to do now, most urgent first. A placed order isn’t a sale until the customer confirms it and you’ve verified it.
        </p>
      </header>
      {(unsourced.data ?? []).length > 0 && (
        <section aria-labelledby="today-source" className="flex flex-col gap-2">
          <h2 id="today-source" className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            Source review <Tag tone="plain">{unsourced.data!.length}</Tag>
          </h2>
          <p className="text-sm text-zinc-600">
            Orders from the last 30 days with no click ID, tagged link or staff answer. If you know how they found us, add it on the order (Source); if you don’t, leave
            it: unknown stays unknown. A WhatsApp reference is a candidate only, never proof by time alone.
          </p>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
            {unsourced.data!.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-4 text-zinc-900 hover:bg-zinc-50">
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{o.reference}</span>
                    <span className="text-sm">{o.customer_name}</span>
                    <OrderStatusBadge status={o.status} />
                    <span className="text-xs text-zinc-500">
                      {o.whatsapp_reference ? `WhatsApp ${o.whatsapp_reference}` : o.visitor_id ? 'Website visit, no source recorded' : 'No visit linked'}
                    </span>
                  </span>
                  <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-[15px] text-zinc-600 ring-1 ring-zinc-200">Nothing waiting. New orders appear here the moment they’re placed.</p>
      ) : (
        groups.map((g) => (
          <section key={g.kind} aria-labelledby={`today-${g.kind}`} className="flex flex-col gap-2">
            <h2 id={`today-${g.kind}`} className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
              {TASK_TITLE[g.kind]} <Tag tone={g.kind === 'contact_new' || g.kind === 'send_purchase' ? 'warn' : 'plain'}>{g.items.length}</Tag>
            </h2>
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
              {g.items.map((t) => (
                <TaskRow key={`${t.kind}-${t.order.id}`} task={t} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function TaskRow({ task }: { task: TodayTask }) {
  const o = task.order
  return (
    <li>
      <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-4 text-zinc-900 hover:bg-zinc-50">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">{o.reference}</span>
            <span className="text-sm">{o.customer_name}</span>
            <span className="text-sm text-zinc-600">{formatPrice(o.total_amount)}</span>
            <OrderStatusBadge status={o.status} />
            {o.held_at && <Tag tone="warn">Hold</Tag>}
          </span>
          <span className="text-sm text-zinc-600">{task.why}</span>
          {task.window && <span className={`text-xs ${task.window.urgent || task.window.expired ? 'font-semibold text-amber-800' : 'text-zinc-500'}`}>{purchaseWindowText(task.window)}</span>}
        </span>
        <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  )
}
