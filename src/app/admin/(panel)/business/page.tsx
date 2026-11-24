import type { Metadata } from 'next'
import { DailyBars, KeyTable, PeriodChips, Section, Stat } from '@/components/admin/Reports'
import { periodFrom } from '@/lib/admin/period'
import { formatPrice } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Business' }
export const dynamic = 'force-dynamic'

// Admin → Business (Run 3): real orders by status and value, the daily trend,
// verified, delivered and cancelled, and the discounts given
// (admin_business_summary). Order values, not profit: the shop's costs aren't
// recorded, so nothing here claims a margin.

interface Business {
  by_status: { status: string; orders: number; value: number }[]
  placed: number
  placed_value: number
  verified: number
  verified_value: number
  delivered: number
  delivered_value: number
  cancelled: number
  cancelled_value: number
  discounts_given: number
  by_offer: Record<string, number>
  daily: { day: string; orders: number; value: number; verified: number }[]
}

const STATUS_WORDS: Record<string, string> = { pending_cod: 'Placed, waiting for the customer', confirmed: 'Confirmed by the customer', delivered: 'Delivered', cancelled: 'Cancelled' }
const OFFER_WORDS: Record<string, string> = { event: 'Christmas and New Year season', welcome: 'Welcome offer', none: 'No offer' }

export default async function BusinessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const period = periodFrom(await searchParams)
  const { data, error } = await (await createClient()).rpc('admin_business_summary', { p_from: period.from, p_to: period.to })
  if (error) throw new Error(`Business: ${error.message}`)
  const b = data as unknown as Business
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Business</h1>
        <p className="text-[15px] text-zinc-600">
          Real orders placed in the period (test orders excluded), at their order value. These are takings, not profit: costs aren’t recorded here.
        </p>
        <PeriodChips base="/admin/business" period={period} filters={false} />
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Placed" value={b.placed} note={formatPrice(Number(b.placed_value))} />
        <Stat label="Staff verified" value={b.verified} note={formatPrice(Number(b.verified_value))} tone="good" />
        <Stat label="Delivered" value={b.delivered} note={formatPrice(Number(b.delivered_value))} tone="good" />
        <Stat label="Cancelled" value={b.cancelled} note={formatPrice(Number(b.cancelled_value))} tone={b.cancelled > 0 ? 'warn' : 'plain'} />
      </div>
      <Section title="By day" intro="Orders placed and orders staff verified, per UK day.">
        <DailyBars rows={b.daily} series="orders" label="Orders placed" />
        <DailyBars rows={b.daily} series="verified" label="Verified" />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="By status">
          <KeyTable head={['Status', 'Orders', 'Value']} rows={b.by_status.map((r) => [STATUS_WORDS[r.status] ?? r.status, r.orders, formatPrice(Number(r.value))])} />
        </Section>
        <Section title="Offers" intro={`Discounts given on orders not cancelled: ${formatPrice(Number(b.discounts_given))}.`}>
          <KeyTable head={['Offer', 'Orders']} rows={Object.entries(b.by_offer).map(([k, v]) => [OFFER_WORDS[k] ?? k, v])} />
        </Section>
      </div>
    </div>
  )
}
