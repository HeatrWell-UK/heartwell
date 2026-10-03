import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { APP_ENV, SITE_INDEXABLE } from '@/config/env'
import { SITE_URL } from '@/config/site'
import { BUILD_COMMIT, INTEGRATIONS } from '@/config/integrations'
import { buildStatusChecks, type AdminStatusData } from './status'

/** Everything the Home and Status pages show, from one database call. */
export async function loadStatus() {
  let data: AdminStatusData | null = null
  let dbError: string | null = null

  if (SUPABASE_CONFIGURED) {
    try {
      const supabase = await createClient()
      const { data: result, error } = await supabase.rpc('admin_status')
      if (error) dbError = error.message
      else data = result as unknown as AdminStatusData
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error)
    }
  }

  const checks = buildStatusChecks(
    {
      appEnv: APP_ENV,
      siteUrl: SITE_URL,
      indexable: SITE_INDEXABLE,
      commit: BUILD_COMMIT,
      supabaseConfigured: SUPABASE_CONFIGURED,
      secretKeyConfigured: SUPABASE_SECRET_CONFIGURED,
      smtpConfigured: INTEGRATIONS.smtp,
      trackingConfigured: INTEGRATIONS.metaTracking,
    },
    data,
    dbError,
  )

  return { data, checks }
}
