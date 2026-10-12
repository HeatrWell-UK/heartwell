// Scheduled jobs, started by the database (pg_cron calls this through pg_net).
// Each call carries a one-time ticket the database made for that run: it's
// claimed here, the work is done, and the outcome is written back to
// job_runs, which the admin Status page shows. No secret lives in the app:
// a ticket works once, for one job, for 15 minutes.

import type { SupabaseClient } from '@supabase/supabase-js'
import { EMAIL, SMTP_CONFIGURED } from '@/config/email'
import { APP_ENV } from '@/config/env'
import { sendEmail } from '@/lib/email/send'
import { buildStatusChecks, feedSummary, type AdminStatusData } from '@/lib/admin/status'
import { statusContext } from '@/lib/admin/status-context'
import { alertEmail, problemsFrom, type AlertNotice } from '@/lib/monitoring/alerts'
import { digestEmail, type DigestData } from '@/lib/reports/digest'
import { createPublicClient } from '@/lib/supabase/public'
import { sendReviewRequest, type ReviewRequestRow } from '@/lib/leads/notify'
import type { Database, Json } from '@/types/database'
import { SITE_URL } from '@/config/site'
import { liveAllowed } from '@/config/tracking'
import { processConversion, type OutboxRow, type ReportResult } from '@/lib/tracking/conversions'
import { GA4_SETUP, getTrackingSettings, META_SETUP, sendToGa4, sendToMeta } from '@/lib/tracking/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Outcome = { status: 'ok' | 'failed' | 'skipped'; detail: Record<string, Json> }
type Job = (db: SupabaseClient<Database>, ticket: string) => Promise<Outcome>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ask for reviews three days after delivery (at most 10 a run, so one run stays well within its time). */
async function reviewRequests(db: SupabaseClient<Database>, ticket: string): Promise<Outcome> {
  if (!SMTP_CONFIGURED) return { status: 'skipped', detail: { reason: 'Email isn’t set up yet (SMTP_PASSWORD)' } }
  const { data, error } = await db.rpc('review_requests_due', { p_ticket: ticket, p_limit: 10 })
  if (error) throw new Error(error.message)
  const due = (data ?? []) as unknown as ReviewRequestRow[]
  let sent = 0
  let failed = 0
  for (const order of due) {
    const result = await sendReviewRequest(order)
    if (result === 'sent') sent++
    else if (result === 'failed') failed++
  }
  return { status: failed > 0 && sent === 0 ? 'failed' : 'ok', detail: { asked: due.length, sent, failed } }
}

/** Send what the conversion outbox has due (Purchase, OrderDelivered, GA4 purchase), in the admin's tracking mode. */
async function conversions(db: SupabaseClient<Database>, ticket: string): Promise<Outcome> {
  const { data, error } = await db.rpc('conversions_due', { p_ticket: ticket, p_limit: 25 })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as OutboxRow[]
  if (rows.length === 0) return { status: 'ok', detail: { due: 0 } }
  const { mode: setting } = await getTrackingSettings()
  const ctx = {
    setting,
    // Jobs have no visitor request: the live check uses the site's own address.
    liveAllowed: liveAllowed(new URL(SITE_URL).host),
    siteUrl: SITE_URL,
    send: { setup: { meta: META_SETUP, ga4: GA4_SETUP }, meta: sendToMeta, ga4: sendToGa4 },
  }
  const results: ReportResult[] = []
  for (const row of rows) results.push(await processConversion(row, ctx))
  const report = await db.rpc('conversions_report', { p_ticket: ticket, p_results: results as unknown as Json })
  if (report.error) throw new Error(report.error.message)
  const count = (s: string) => results.filter((r) => r.status === s).length
  const sent = count('sent')
  const failed = count('failed')
  return { status: failed > 0 && sent === 0 ? 'failed' : 'ok', detail: { due: rows.length, sent, failed, closed: count('skipped'), mode: setting } }
}

/**
 * Every hour: the Health card's own verdicts, worked out here from the
 * database's snapshot. Red ones are reported to the database, which says
 * which are new (or still red a day later) and which have been fixed; those
 * go to the shop in one email.
 */
async function healthCheck(db: SupabaseClient<Database>, ticket: string): Promise<Outcome> {
  const snapshot = await db.rpc('health_snapshot', { p_ticket: ticket })
  if (snapshot.error) throw new Error(snapshot.error.message)
  const data = snapshot.data as unknown as AdminStatusData
  const problems = problemsFrom(buildStatusChecks(statusContext(), data, null, feedSummary(data)))
  const report = await db.rpc('health_report', { p_ticket: ticket, p_problems: problems as unknown as Json })
  if (report.error) throw new Error(report.error.message)
  const { notify, resolved } = report.data as unknown as { notify: AlertNotice[]; resolved: { key: string; title: string }[] }
  let emailed: 'sent' | 'failed' | 'skipped' | 'nothing new' = 'nothing new'
  if (notify.length > 0 || resolved.length > 0) {
    const email = alertEmail(notify, resolved, { statusUrl: `${SITE_URL}/admin/status`, appEnv: APP_ENV })
    emailed = await sendEmail({ kind: 'health_alert', to: EMAIL.shopTo, cc: EMAIL.shopCopy, ...email, toCustomer: false })
  }
  return { status: 'ok', detail: { red: problems.map((p) => p.key), newly: notify.map((n) => n.key), fixed: resolved.map((r) => r.key), emailed } }
}

/** Monday morning: last week's orders, sources, enquiries and landing pages, to the shop. */
async function mondayDigest(db: SupabaseClient<Database>, ticket: string): Promise<Outcome> {
  if (!SMTP_CONFIGURED) return { status: 'skipped', detail: { reason: 'Email isn’t set up yet (SMTP_PASSWORD)' } }
  const { data, error } = await db.rpc('digest_data', { p_ticket: ticket })
  if (error) throw new Error(error.message)
  const digest = data as unknown as DigestData
  const email = digestEmail(digest, { adminUrl: `${SITE_URL}/admin`, appEnv: APP_ENV })
  const sent = await sendEmail({ kind: 'monday_digest', to: EMAIL.shopTo, cc: EMAIL.shopCopy, ...email, toCustomer: false })
  return { status: sent === 'failed' ? 'failed' : 'ok', detail: { confirmed: Number(digest.orders.confirmed), sent } }
}

const JOBS: Record<string, Job> = { 'review-requests': reviewRequests, conversions, 'health-check': healthCheck, 'monday-digest': mondayDigest }

export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params
  const run = JOBS[job]
  if (!run) return Response.json({ error: 'Unknown job' }, { status: 404 })
  const ticket = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!UUID.test(ticket)) return Response.json({ error: 'Not authorised' }, { status: 401 })

  const db = createPublicClient()
  const claim = await db.rpc('job_claim', { p_ticket: ticket, p_job: job })
  if (claim.error || !(claim.data as { ok?: boolean } | null)?.ok) return Response.json({ error: 'Not authorised' }, { status: 401 })

  let outcome: Outcome
  let error: string | null = null
  try {
    outcome = await run(db, ticket)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    outcome = { status: 'failed', detail: {} }
    console.error(`job ${job} failed`, error)
  }
  const finish = await db.rpc('job_finish', { p_ticket: ticket, p_status: outcome.status, p_detail: outcome.detail, p_error: error ?? (outcome.status === 'skipped' ? String(outcome.detail.reason ?? '') : '') })
  if (finish.error) console.error(`job ${job} could not report back`, finish.error.message)
  return Response.json({ job, status: outcome.status, ...outcome.detail })
}
