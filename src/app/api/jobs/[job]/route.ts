// Scheduled jobs, started by the database (pg_cron calls this through pg_net).
// Each call carries a one-time ticket the database made for that run: it's
// claimed here, the work is done, and the outcome is written back to
// job_runs, which the admin Status page shows. No secret lives in the app:
// a ticket works once, for one job, for 15 minutes.

import type { SupabaseClient } from '@supabase/supabase-js'
import { SMTP_CONFIGURED } from '@/config/email'
import { createPublicClient } from '@/lib/supabase/public'
import { sendReviewRequest, type ReviewRequestRow } from '@/lib/leads/notify'
import type { Database, Json } from '@/types/database'

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

const JOBS: Record<string, Job> = { 'review-requests': reviewRequests }

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
