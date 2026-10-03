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
 * the database doesn't. Phase 17 adds email, tracking and scheduled jobs.
 */
export async function GET() {
  const database = await pingDatabase()
  const ok = database !== 'error'
  return NextResponse.json(
    { ok, env: APP_ENV, commit: BUILD_COMMIT, database, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
