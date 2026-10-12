// For an outside monitor (UptimeRobot): 200 while the shop's hourly health
// check is green and has run recently, 503 when anything on the Health card is
// red or the check itself has stopped. It says how many checks are red, never
// which or why: that stays in the admin. It also covers the one failure the
// alert emails can't, email itself.

import { NextResponse } from 'next/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { createPublicClient } from '@/lib/supabase/public'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { healthVerdict } from '@/lib/monitoring/alerts'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!rateLimit(`health-checks:${await clientIp()}`, 30, 60_000)) return NextResponse.json({ ok: false, error: 'slow down' }, { status: 429 })
  let state: { red: number; last_check: string | null } | null = null
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await createPublicClient().rpc('health_state')
    if (!error && data) state = data as unknown as { red: number; last_check: string | null }
  }
  const v = healthVerdict(state)
  return NextResponse.json(
    { ok: v.ok, red: v.red, stale: v.stale, checked: state?.last_check ?? null },
    { status: v.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
