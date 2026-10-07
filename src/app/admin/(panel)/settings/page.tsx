import type { Metadata } from 'next'
import Link from 'next/link'
import { PulseIcon } from '@phosphor-icons/react/ssr'
import { AdOfferSwitch, OfferCodes, SettingsForm } from '@/components/admin/SettingsForms'
import { loadSettings } from '@/lib/admin/load-catalogue'
import { settingsDraft } from '@/lib/admin/settings-form'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { settings, codes, tierCounts } = await loadSettings()
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Settings</h1>
        <p className="text-[15px] text-zinc-600">
          Delivery prices and dates, offers and samples. Checkout always works out the money from these figures in the database, so a change applies to the next order. Meta and Google tracking has its own page, and the catalogue feed and ad links are on Ad links.
        </p>
        <Link href="/admin/status" className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-700 underline underline-offset-2">
          <PulseIcon aria-hidden="true" size={16} /> System status
        </Link>
      </header>
      <SettingsForm initial={settingsDraft(settings)} tierCounts={tierCounts} />
      <AdOfferSwitch on={settings.paid_offer_enabled} days={settings.paid_offer_days} code={codes.find((c) => c.is_active)?.code ?? null} />
      <OfferCodes codes={codes} />
    </div>
  )
}
