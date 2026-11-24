import type { Metadata } from 'next'
import { DailyBars, KeyTable, PeriodChips, Section, Stat } from '@/components/admin/Reports'
import { periodFrom, pct } from '@/lib/admin/period'
import { formatPrice } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Website' }
export const dynamic = 'force-dynamic'

// Admin → Website (Run 3): visits, baskets, checkouts, WhatsApp taps against
// real enquiries, and orders placed / confirmed / verified / delivered /
// cancelled, from the shop's own records (admin_website_summary). Visits are
// recorded only with permission for advertising measurement, so they undercount
// real traffic; orders are all real orders. Sessions are visits, not people.

interface Summary {
  sessions: number
  visitors: number
  sessions_by_source: Record<string, number>
  sessions_by_first_touch: Record<string, number>
  sessions_by_device: Record<string, number>
  sessions_with: { basket: number; checkout: number; whatsapp_opened: number; phone: number }
  whatsapp: { taps: number; opened: number; stuck: number; became_orders: number }
  orders: { placed: number; placed_value: number; customer_confirmed: number; staff_verified: number; verified_value: number; held: number; delivered: number; cancelled: number }
  top_landing: { path: string; sessions: number }[]
  top_products: { product: string; basket_adds: number }[]
  daily: { day: string; sessions: number; basket: number; orders: number }[]
  returning_after_offer: { bucket: string; windows: number; returned: number }[] | null
  coverage: { visits_since: string | null }
}

export default async function WebsitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const period = periodFrom(await searchParams)
  const { data, error } = await (await createClient()).rpc('admin_website_summary', { p_from: period.from, p_to: period.to, p_device: period.device ?? undefined, p_source: period.source ?? undefined })
  if (error) throw new Error(`Website: ${error.message}`)
  const s = data as unknown as Summary
  const o = s.orders
  const entries = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Website</h1>
        <p className="text-[15px] text-zinc-600">
          Visits are counted only for visitors who allowed advertising measurement, so they undercount real traffic. Orders are every real order. A visit is a
          session, not a person.
        </p>
        <PeriodChips base="/admin/website" period={period} />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visits" value={s.sessions} note={`${s.visitors} browsers`} />
        <Stat label="Added to basket" value={s.sessions_with.basket} note={`${pct(s.sessions_with.basket, s.sessions)} of visits`} />
        <Stat label="Started checkout" value={s.sessions_with.checkout} note={`${pct(s.sessions_with.checkout, s.sessions_with.basket)} of basket visits`} />
        <Stat label="Orders placed" value={o.placed} note={formatPrice(o.placed_value)} />
        <Stat label="Customer confirmed" value={o.customer_confirmed} note={`${pct(o.customer_confirmed, o.placed)} of placed`} />
        <Stat label="Staff verified" value={o.staff_verified} note={formatPrice(o.verified_value)} tone="good" />
        <Stat label="Delivered" value={o.delivered} />
        <Stat label="Cancelled / held" value={`${o.cancelled} / ${o.held}`} tone={o.held > 0 ? 'warn' : 'plain'} />
      </div>

      <Section title="By day" intro="Visits, visits with a basket add, and orders placed, per UK day.">
        <DailyBars rows={s.daily} series="sessions" label="Visits" />
        <DailyBars rows={s.daily} series="basket" label="Basket visits" />
        <DailyBars rows={s.daily} series="orders" label="Orders placed" />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Where visits came from" intro="Last touch, from evidence (click IDs, tagged links, referrer). Meta includes fb, ig, msg and an. Unknown stays unknown.">
          <KeyTable head={['Source', 'Visits', 'Share']} rows={entries(s.sessions_by_source).map(([k, v]) => [k, v, pct(v, s.sessions)])} />
          <p className="text-xs text-zinc-500">
            First touch: {entries(s.sessions_by_first_touch).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'}
          </p>
        </Section>
        <Section title="Devices">
          <KeyTable head={['Device', 'Visits', 'Share']} rows={entries(s.sessions_by_device).map(([k, v]) => [k, v, pct(v, s.sessions)])} />
        </Section>
        <Section title="WhatsApp" intro="Taps on a WhatsApp button against what happened next. A tap isn't an enquiry until a message arrives.">
          <KeyTable
            head={['Step', 'Count']}
            rows={[
              ['Taps (HW-WA reference made)', s.whatsapp.taps],
              ['WhatsApp opened', s.whatsapp.opened],
              ['Got stuck (help shown)', s.whatsapp.stuck],
              ['Became an order', s.whatsapp.became_orders],
              ['Phone taps', s.sessions_with.phone],
            ]}
          />
        </Section>
        <Section title="Top landing pages">
          <KeyTable head={['Page', 'Visits']} rows={s.top_landing.map((r) => [r.path, r.sessions])} />
        </Section>
        <Section title="Most added to basket">
          <KeyTable head={['Product', 'Basket adds']} rows={s.top_products.map((r) => [r.product, r.basket_adds])} />
        </Section>
        <Section
          title="Came back during their 14-day offer"
          intro="Seasonal windows that started in this period, and how many of those visitors came back, by days since their window started. Only windows old enough for a bucket are counted in it."
        >
          <KeyTable head={['Days since start', 'Windows (mature)', 'Came back', 'Rate']} rows={(s.returning_after_offer ?? []).map((r) => [r.bucket, r.windows, r.returned, pct(r.returned, r.windows)])} />
        </Section>
      </div>
      <p className="text-xs text-zinc-500">Visits recorded since {s.coverage.visits_since ? new Date(s.coverage.visits_since).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }) : '–'}.</p>
    </div>
  )
}
