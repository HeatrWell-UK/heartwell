import type { Metadata } from 'next'
import Link from 'next/link'
import { OrderStatusBadge, Tag } from '@/components/admin/OrderBits'
import { createClient } from '@/lib/supabase/server'
import { dualTime } from '@/lib/admin/workstation'

export const metadata: Metadata = { title: 'Source review' }
export const dynamic = 'force-dynamic'

// Admin → Source review (Run 4): where each recent order came from, on the
// evidence. Click IDs and tagged links count; a staff answer (on the order,
// with a note and time) counts; a WhatsApp reference is a candidate only and
// time proximity is never proof. Unknown stays unknown: nothing is assigned
// automatically. The Today list stays a short summary of the same rule.

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const FILTERS = ['unknown', 'staff', 'evidence', 'all'] as const
const PERIODS = { '30': 30, '90': 90 } as const

interface Order {
  id: string
  reference: string | null
  customer_name: string
  status: string
  created_at: string
  is_test: boolean
  fbclid: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  whatsapp_reference: string | null
  visitor_id: string | null
  manual_acquisition_source: string | null
  manual_acquisition_note: string | null
  manual_acquisition_at: string | null
}

function evidence(o: Order): string | null {
  if (o.fbclid) return 'Meta click ID'
  if (o.gclid || o.gbraid || o.wbraid) return 'Google click ID'
  if (o.utm_source) return `Tagged link: ${o.utm_source}${o.utm_medium ? ` / ${o.utm_medium}` : ''}${o.utm_campaign ? ` · ${o.utm_campaign}` : ''}`
  return null
}

export default async function SourceReviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const filter = (FILTERS as readonly string[]).includes(one(params.show)) ? one(params.show) : 'unknown'
  const days = PERIODS[(one(params.days) as keyof typeof PERIODS) || '30'] ?? 30
  const since = new Date(new Date().setUTCHours(0, 0, 0, 0) - days * 86_400_000).toISOString()
  const { data, error } = await (await createClient())
    .from('orders')
    .select('id, reference, customer_name, status, created_at, is_test, fbclid, gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, whatsapp_reference, visitor_id, manual_acquisition_source, manual_acquisition_note, manual_acquisition_at')
    .eq('is_test', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .range(0, 1999)
  if (error) throw new Error(`Source review: ${error.message}`)
  const all = (data ?? []) as Order[]
  const kindOf = (o: Order) => (evidence(o) ? 'evidence' : o.manual_acquisition_source ? 'staff' : 'unknown')
  const rows = all.filter((o) => filter === 'all' || kindOf(o) === filter)
  const n = (k: string) => all.filter((o) => kindOf(o) === k).length
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${on ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200 hover:ring-zinc-300'}`
  const label: Record<string, string> = { unknown: 'Unknown', staff: 'Staff answer', evidence: 'Evidence', all: 'All' }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Source review</h1>
        <p className="text-[15px] text-zinc-600">
          Where each order came from, on the evidence. If you know how a customer found us, add it on the order (Source, with a note). If you don’t, leave it: unknown stays unknown.
          A WhatsApp reference is a candidate only; a visit close in time is never proof. Test orders are left out.
        </p>
        <nav aria-label="Show" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link key={f} href={`/admin/source-review?show=${f}&days=${days}`} className={chip(filter === f)}>
              {label[f]} {f !== 'all' && <span className="tabular-nums">{n(f)}</span>}
            </Link>
          ))}
          <span className="mx-1 w-px bg-zinc-200" aria-hidden="true" />
          {Object.keys(PERIODS).map((d) => (
            <Link key={d} href={`/admin/source-review?show=${filter}&days=${d}`} className={chip(String(days) === d)}>
              {d} days
            </Link>
          ))}
        </nav>
      </header>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
        {rows.map((o) => {
          const ev = evidence(o)
          return (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-col gap-1 p-4 text-zinc-900 hover:bg-zinc-50">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{o.reference}</span>
                  <span className="text-sm">{o.customer_name}</span>
                  <OrderStatusBadge status={o.status} />
                  <Tag tone={kindOf(o) === 'unknown' ? 'warn' : 'plain'}>{label[kindOf(o)]}</Tag>
                </span>
                <span className="text-sm text-zinc-600">
                  {ev ??
                    (o.manual_acquisition_source
                      ? `Staff: ${o.manual_acquisition_source}${o.manual_acquisition_note ? ` (${o.manual_acquisition_note})` : ''}${o.manual_acquisition_at ? ` · ${dualTime(o.manual_acquisition_at)}` : ''}`
                      : o.whatsapp_reference
                        ? `Candidate only: WhatsApp ${o.whatsapp_reference}`
                        : o.visitor_id
                          ? 'Website visit linked, no source recorded on it'
                          : 'No visit linked')}
                </span>
                <span className="text-xs text-zinc-500">{dualTime(o.created_at)}</span>
              </Link>
            </li>
          )
        })}
        {rows.length === 0 && <li className="p-6 text-sm text-zinc-600">Nothing in this view.</li>}
      </ul>
    </div>
  )
}
