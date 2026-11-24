import type { Metadata } from 'next'
import Link from 'next/link'
import { DailyBars, Funnel, KeyTable, PeriodChips, Section, Stat, type FunnelStep } from '@/components/admin/Reports'
import { periodFrom, periodHref, pct } from '@/lib/admin/period'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Journeys' }
export const dynamic = 'force-dynamic'

// Admin → Journeys (Run 3): how visits move through the shop, from the
// consented journey events (admin_journey_daily): an ordered funnel of distinct
// sessions, phones against computers, sources, the daily trend, delivery
// checks, the fields that fail and where visits stop. Codes only; the explorer
// shows redacted rows. Recording began with Run 3, so early periods are thin.

interface FunnelData {
  sessions: number
  steps: FunnelStep[]
  whatsapp_sessions: number
  saved_any_path: number
}
interface Daily {
  funnel: FunnelData
  prior: FunnelData
  by_device: { device: string; funnel: FunnelData }[]
  by_source: { source: string; funnel: FunnelData }[]
  daily: { day: string; sessions: number; basket: number; checkout: number; saved: number }[]
  delivery_checks: { outcome: string; checks: number; sessions: number }[]
  errors: { field: string; error: string; events: number; sessions: number }[]
  exits: { page_type: string; last_event: string; sessions: number }[]
  coverage: { observed_since: string | null; events: number }
}
interface Row {
  created_at: string
  session_key: string
  event: string
  page_type: string | null
  page_path: string | null
  step: string | null
  outcome: string | null
  error_code: string | null
  field_category: string | null
  cta_position: string | null
  scroll_percent: number | null
  device: string
  source: string
  product: string | null
}

const withEvent = (href: string, e: string) => (e ? `${href}${href.includes('?') ? '&' : '?'}event=${e}` : href)

const OUTCOME_WORDS: Record<string, string> = { covered: 'Free delivery area', charged: 'Delivery charge area', not_covered: 'Ask us (quote / depends)', invalid: 'Not a postcode' }

export default async function JourneysPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const period = periodFrom(params)
  const event = typeof params.event === 'string' && /^[a-z_]{2,40}$/.test(params.event) ? params.event : undefined
  const db = await createClient()
  const [daily, explorer] = await Promise.all([
    db.rpc('admin_journey_daily', { p_from: period.from, p_to: period.to, p_device: period.device ?? undefined, p_source: period.source ?? undefined }),
    db.rpc('admin_journey_explorer', { p_from: period.from, p_to: period.to, p_event: event, p_limit: 100 }),
  ])
  if (daily.error) throw new Error(`Journeys: ${daily.error.message}`)
  if (explorer.error) throw new Error(`Journeys: ${explorer.error.message}`)
  const d = daily.data as unknown as Daily
  const rows = (explorer.data ?? []) as unknown as Row[]
  const f = d.funnel
  const saved = f.steps.at(-1)?.sessions ?? 0
  const when = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Journeys</h1>
        <p className="text-[15px] text-zinc-600">
          How visits move through the shop, from visitors who allowed statistics. Each step counts distinct visits that reached it and every step before. Codes only:
          never what anyone typed. Recording started {d.coverage.observed_since ? when(d.coverage.observed_since) : 'with Run 3 (no events yet)'}, so compare like
          periods and don’t read early numbers as trends.
        </p>
        <PeriodChips base="/admin/journeys" period={period} />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visits" value={f.sessions} note={`before: ${d.prior.sessions}`} />
        <Stat label="Order saved (in order)" value={saved} note={`${pct(saved, f.sessions)} of visits`} />
        <Stat label="Order saved (any path)" value={f.saved_any_path} />
        <Stat label="Tapped WhatsApp" value={f.whatsapp_sessions} />
      </div>

      <Section title="Funnel" intro="Grey numbers are the same length of time just before this period.">
        <Funnel steps={f.steps} prior={d.prior.steps} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        {d.by_device.map((x) => (
          <Section key={x.device} title={`Device: ${x.device}`}>
            <Funnel steps={x.funnel.steps} />
          </Section>
        ))}
      </div>

      <Section title="By source" intro="Last touch of the visit. Unattributed: no advertising permission, so the visit's source isn't known.">
        <KeyTable
          head={['Source', 'Visits', 'Basket', 'Checkout', 'Saved', 'Saved rate']}
          rows={d.by_source.map((x) => {
            const st = Object.fromEntries(x.funnel.steps.map((s) => [s.key, s.sessions]))
            return [x.source, st.viewed ?? 0, st.basket ?? 0, st.checkout ?? 0, x.funnel.saved_any_path, pct(x.funnel.saved_any_path, st.viewed ?? 0)]
          })}
        />
      </Section>

      <Section title="By day">
        <DailyBars rows={d.daily} series="sessions" label="Visits" />
        <DailyBars rows={d.daily} series="checkout" label="Checkout visits" />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Delivery checks" intro="Each check counted once by its result. Checks, not people.">
          <KeyTable head={['Result', 'Checks', 'Visits']} rows={d.delivery_checks.map((r) => [OUTCOME_WORDS[r.outcome] ?? r.outcome, r.checks, r.sessions])} />
        </Section>
        <Section title="What went wrong" intro="Fields that failed their check, and failed basket adds or orders, by kind.">
          <KeyTable head={['Field', 'Problem', 'Times', 'Visits']} rows={d.errors.map((r) => [r.field, r.error, r.events, r.sessions])} />
        </Section>
        <Section title="Where visits stopped" intro="The last step of visits that didn't save an order in this period.">
          <KeyTable head={['Page', 'Last step', 'Visits']} rows={d.exits.map((r) => [r.page_type, r.last_event, r.sessions])} />
        </Section>
      </div>

      <Section title="Explorer" intro="The latest 100 events, redacted: a short one-way key per visit, the page and codes. Filter by event:">
        <nav aria-label="Event" className="flex flex-wrap gap-1.5 text-xs">
          {['', 'page_view', 'basket_add', 'checkout_step', 'validation_error', 'postcode_check', 'place_order', 'whatsapp_click', 'page_exit'].map((e) => (
            <Link
              key={e || 'all'}
              href={withEvent(periodHref('/admin/journeys', period, {}), e)}
              className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${event === e || (!event && !e) ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200'}`}
            >
              {e || 'all'}
            </Link>
          ))}
        </nav>
        <KeyTable
          head={['When', 'Visit', 'Event', 'Page', 'Detail', 'Device', 'Source']}
          rows={rows.map((r) => [
            when(r.created_at),
            r.session_key,
            r.event,
            r.page_path ?? r.page_type ?? '',
            [r.product, r.step, r.outcome, r.field_category, r.error_code, r.cta_position, r.scroll_percent != null ? `${r.scroll_percent}%` : null].filter(Boolean).join(' · '),
            r.device,
            r.source,
          ])}
        />
      </Section>
    </div>
  )
}
