import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircleIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react/ssr'
import { ActButton } from '@/components/admin/ActButton'
import { Card } from '@/components/admin/Fields'
import { Tag } from '@/components/admin/OrderBits'
import { StaffDeviceToggle, TrackingSettingsForm } from '@/components/admin/TrackingForms'
import { loadTracking } from '@/lib/admin/load-tracking'
import { dualTime } from '@/lib/admin/orders'
import { effectiveMode, liveAllowed, type TrackingMode } from '@/config/tracking'
import { SITE_URL } from '@/config/site'
import { GA4_SETUP, META_SETUP, TRACKING_SETUP } from '@/lib/tracking/server'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'
import { outboxAction } from './actions'

export const metadata: Metadata = { title: 'Tracking' }
export const dynamic = 'force-dynamic'

const MODE_LABEL: Record<TrackingMode, string> = { dry_run: 'Dry run (nothing sent)', test: 'Test events only', live: 'Live' }

function Setting({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircleIcon aria-hidden="true" size={18} weight="fill" className="text-emerald-600" /> : <XCircleIcon aria-hidden="true" size={18} className="text-zinc-400" />}
      <span className={ok ? 'text-zinc-900' : 'text-zinc-500'}>
        {label}
        <span className="sr-only">{ok ? ': set' : ': not set'}</span>
      </span>
    </li>
  )
}

/** One line on what the platform said back. */
function reply(response: unknown, error: unknown): string | null {
  const r = (response ?? error) as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return null
  if (typeof r.events_received === 'number') return `Meta received ${r.events_received}`
  if (Array.isArray(r.validationMessages)) return r.validationMessages.length ? `GA4 checker: ${r.validationMessages.length} problem(s)` : 'GA4 checker: OK'
  const e = (r.error ?? r) as Record<string, unknown>
  return typeof e.message === 'string' ? e.message.slice(0, 160) : null
}

const STATUS_TONE: Record<string, 'plain' | 'warn' | 'test' | 'source'> = { sent: 'source', failed: 'warn', held: 'warn', pending: 'plain', sending: 'plain', skipped: 'plain' }

export default async function TrackingPage() {
  const { settings, outbox, tally, log, sentThenCancelled } = await loadTracking()
  const mode = settings.tracking_mode as TrackingMode
  const siteIsLive = liveAllowed(new URL(SITE_URL).host)
  const metaNow = effectiveMode(mode, META_SETUP, { liveAllowed: siteIsLive, isTest: false })
  const ga4Now = effectiveMode(mode, GA4_SETUP, { liveAllowed: siteIsLive, isTest: false })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Tracking</h1>
        <p className="text-[15px] text-zinc-600">
          Meta (Pixel and Conversions API) and Google Analytics 4. Purchases go from the server once a customer confirms, exactly once. Personal details are only ever sent hashed, and never order numbers or private links.
        </p>
      </header>

      {!siteIsLive && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <WarningIcon aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
          This site isn’t the live shop (heartwellfurniture.co.uk with APP_ENV=production), so nothing from here is ever sent as a real event. Test mode and dry runs work as normal.
        </p>
      )}

      {sentThenCancelled.length > 0 && (
        <section aria-label="Cancelled after sending" className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-red-900">
            <WarningIcon aria-hidden="true" size={20} />
            Purchases already sent for orders that were later cancelled
          </p>
          <p className="text-sm text-red-900">Meta can’t take a Purchase back. Bear these in mind when reading ad results.</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {sentThenCancelled.map((r) =>
              r.order ? (
                <li key={r.id}>
                  <Link href={`/admin/orders/${r.order.id}`} className="font-semibold text-red-900 underline">
                    {r.order.reference}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Meta" intro={`Right now: ${MODE_LABEL[metaNow]}.`}>
          <ul className="flex flex-col gap-1.5">
            <Setting ok={TRACKING_SETUP.metaPixelId} label="Pixel (dataset) ID: NEXT_PUBLIC_META_PIXEL_ID" />
            <Setting ok={TRACKING_SETUP.metaToken} label="Conversions API token: META_CAPI_ACCESS_TOKEN" />
            <Setting ok={TRACKING_SETUP.metaTestCode} label="Test event code: META_TEST_EVENT_CODE" />
          </ul>
        </Card>
        <Card title="Google Analytics 4" intro={`Right now: ${MODE_LABEL[ga4Now]}.`}>
          <ul className="flex flex-col gap-1.5">
            <Setting ok={TRACKING_SETUP.ga4Id} label="Measurement ID: NEXT_PUBLIC_GA4_MEASUREMENT_ID" />
            <Setting ok={TRACKING_SETUP.ga4Secret} label="Measurement Protocol secret: GA4_API_SECRET" />
          </ul>
        </Card>
      </div>

      <Card title="Settings">
        <TrackingSettingsForm initial={{ mode, purchaseMode: settings.purchase_mode as 'automatic' | 'manual', holdMinutes: settings.purchase_hold_minutes }} />
      </Card>

      <Card title="This device">
        <StaffDeviceToggle />
      </Card>

      <section aria-labelledby="queue" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="queue" className="text-lg font-bold">
            Purchases and deliveries
          </h2>
          <p className="text-sm text-zinc-600">
            {(['pending', 'held', 'failed', 'sent', 'skipped'] as const).map((s) => `${tally[s] ?? 0} ${s}`).join(' · ')}
          </p>
        </div>
        {outbox.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-[15px] text-zinc-500">Nothing yet. A Purchase appears here when a customer confirms an order.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {outbox.map((r) => {
              const said = reply(r.response, r.error)
              const waiting = ['pending', 'held', 'failed'].includes(r.status)
              return (
                <li key={r.id} className="flex flex-col gap-1.5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-900">
                      {r.platform === 'ga4' ? 'GA4' : 'Meta'} {r.event_name}
                    </span>
                    {r.order && (
                      <Link href={`/admin/orders/${r.order.id}`} className="font-mono text-sm font-semibold text-zinc-800">
                        {r.order.reference}
                      </Link>
                    )}
                    {r.order && <span className="text-sm text-zinc-600">{formatPrice(Number(r.order.total_amount))}</span>}
                    {r.order?.is_test && <Tag tone="test">Test order</Tag>}
                    <Tag tone={STATUS_TONE[r.status] ?? 'plain'}>{r.status}</Tag>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {r.status === 'sent'
                      ? `Sent ${dualTime(r.sent_at)?.uk ?? ''}`
                      : r.status === 'pending'
                        ? `Due ${dualTime(r.send_after)?.uk ?? ''}`
                        : `Queued ${dualTime(r.created_at)?.uk ?? ''}`}
                    {r.attempts > 1 && ` · ${r.attempts} attempts`}
                    {r.skip_reason && ` · ${r.skip_reason}`}
                    {said && ` · ${said}`}
                  </p>
                  {waiting && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <ActButton act={outboxAction.bind(null, r.id, 'send_now')} label="Send now" tone="primary" />
                      {r.status === 'pending' && <ActButton act={outboxAction.bind(null, r.id, 'hold')} label="Hold" />}
                      <ActButton act={outboxAction.bind(null, r.id, 'skip')} label="Don’t send" tone="danger" confirm="Skip this event? It won’t be sent." />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="events" className="flex flex-col gap-3">
        <h2 id="events" className="text-lg font-bold">
          Recent events
        </h2>
        <p className="text-sm text-zinc-600">Every dry-run and test event, and any live event that went wrong, exactly as built (personal details hashed). Kept 30 days.</p>
        {log.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-[15px] text-zinc-500">
            Nothing yet. Accept cookies on the shop and look at a sofa to see a ViewContent here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {log.map((l) => (
              <li key={l.id}>
                <details className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-zinc-900">
                      {l.platform === 'ga4' ? 'GA4' : 'Meta'} {l.event_name}
                    </span>
                    <span className="text-zinc-500">{l.source === 'outbox' ? 'server' : 'browser + server'}</span>
                    <Tag tone={l.status === 'failed' ? 'warn' : 'plain'}>{l.mode === 'dry_run' ? 'dry run' : l.mode}</Tag>
                    {l.status === 'failed' && <Tag tone="warn">failed</Tag>}
                    <span className="ml-auto text-xs text-zinc-500">{dualTime(l.created_at)?.uk}</span>
                  </summary>
                  <pre className={cn('mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed')}>{JSON.stringify({ sent: l.payload, reply: l.response }, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
