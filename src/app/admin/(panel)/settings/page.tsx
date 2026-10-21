import type { Metadata } from 'next'
import Link from 'next/link'
import { PulseIcon } from '@phosphor-icons/react/ssr'
import { AdOfferSwitch, OfferCodes, SettingsForm, WelcomeOfferSwitch } from '@/components/admin/SettingsForms'
import { loadSettings } from '@/lib/admin/load-catalogue'
import { settingsDraft } from '@/lib/admin/settings-form'
import { OrderFlowCard, type OrderFlowState } from '@/components/admin/OrderFlowCard'
import { DeliveryAreasForm } from '@/components/admin/DeliveryAreasForm'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const db = await createClient()
  const [{ settings, codes, tierCounts }, orderflow, areas, welcomeLive] = await Promise.all([
    loadSettings(),
    db.rpc('admin_orderflow'),
    db.from('delivery_areas').select('slug, name, places, charge, min_working_days, max_working_days, districts').order('sort').order('slug'),
    db.from('welcome_offers').select('visitor_id', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()),
  ])
  if (areas.error) throw new Error(`Delivery areas: ${areas.error.message}`)
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Settings</h1>
        <p className="text-[15px] text-zinc-600">
          Delivery prices, areas and dates, offers, samples and OrderFlow. Checkout always works out the money from these figures in the database, so a change applies to the next order. Meta and Google tracking has its own page, and the catalogue feed and ad links are on Ad links.
        </p>
        <Link href="/admin/status" className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-700 underline underline-offset-2">
          <PulseIcon aria-hidden="true" size={16} /> System status
        </Link>
      </header>
      <SettingsForm initial={settingsDraft(settings)} tierCounts={tierCounts} />
      <DeliveryAreasForm areas={areas.data.map((a) => ({ ...a, charge: Number(a.charge) }))} noDeliveryDays={settings.no_delivery_days} />
      <WelcomeOfferSwitch
        on={settings.welcome_offer_enabled}
        amount={Number(settings.welcome_offer_amount)}
        hours={settings.welcome_offer_hours}
        live={welcomeLive.count ?? 0}
      />
      <AdOfferSwitch on={settings.paid_offer_enabled} days={settings.paid_offer_days} code={codes.find((c) => c.is_active)?.code ?? null} />
      <OfferCodes codes={codes} />
      {orderflow.data ? <OrderFlowCard state={orderflow.data as unknown as OrderFlowState} /> : null}
    </div>
  )
}
