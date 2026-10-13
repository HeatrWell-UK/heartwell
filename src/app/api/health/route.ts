import { NextResponse } from 'next/server'
import { APP_ENV } from '@/config/env'
import { BUILD_COMMIT } from '@/config/integrations'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

type DatabaseState = 'ok' | 'error' | 'not_configured'

async function pingDatabase(): Promise<DatabaseState> {
  if (!SUPABASE_CONFIGURED) return 'not_configured'
  try {
    const { data, error } = await createPublicClient().rpc('health_ping')
    return !error && (data as { ok?: boolean } | null)?.ok === true ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

/**
 * For uptime monitoring: 200 when the site and its database answer, 503 when
 * the database doesn't. /api/health/checks adds the hourly health check
 * (email, OrderFlow, tracking, scheduled jobs).
 */
export async function GET(request: Request) {
  const database = await pingDatabase()
  const ok = database !== 'error'
  // How the host's proxy passes the visitor's address on, as counts and
  // positions only (never the addresses). Sending a made-up x-forwarded-for
  // shows whether the proxy replaces it (still 1 hop) or appends to it (2),
  // which decides how the rate limits find the real address
  // (src/lib/http/rate-limit.ts).
  const hops = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const realIp = request.headers.get('x-real-ip')?.trim()
  const proxy = {
    forwardedHops: hops.length,
    realIp: !realIp ? 'absent' : realIp === hops.at(-1) ? 'last' : realIp === hops[0] ? 'first' : 'other',
  }
  return NextResponse.json(
    { ok, env: APP_ENV, commit: BUILD_COMMIT, database, proxy, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
