import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { APP_ENV, SITE_INDEXABLE } from '@/config/env'
import { SITE_URL } from '@/config/site'
import { BUILD_COMMIT, INTEGRATIONS } from '@/config/integrations'
import { buildStatusChecks, type AdminStatusData, type FeedFetchSummary } from './status'

/** Everything the Home and Status pages show: the database’s own report, and when Meta last fetched the catalogue feed. */
export async function loadStatus() {
  let data: AdminStatusData | null = null
  let dbError: string | null = null
  let feed: FeedFetchSummary | null = null

  if (SUPABASE_CONFIGURED) {
    try {
      const supabase = await createClient()
      const [{ data: result, error }, fetches] = await Promise.all([
        supabase.rpc('admin_status'),
        supabase.from('feed_fetches').select('last_fetched_at, last_items').eq('feed', 'meta').eq('agent', 'meta').maybeSingle(),
      ])
      if (error) dbError = error.message
      else data = result as unknown as AdminStatusData
      if (!fetches.error) feed = { lastFetched: fetches.data?.last_fetched_at ?? null, items: fetches.data?.last_items ?? 0 }
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
      addressLookupConfigured: INTEGRATIONS.addressLookup,
      photoUploadsConfigured: INTEGRATIONS.photoUploads,
      trackingConfigured: INTEGRATIONS.metaTracking,
    },
    data,
    dbError,
    feed,
  )

  return { data, checks }
}
