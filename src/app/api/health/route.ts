import { NextResponse } from 'next/server'
import { APP_ENV } from '@/config/env'

export const dynamic = 'force-dynamic'

/**
 * Liveness check for uptime monitoring. Phase 17 extends it to report the
 * database, email, tracking and scheduled jobs, and to return 503 when any of
 * them is failing.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      env: APP_ENV,
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'unknown').slice(0, 7),
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
