// What the Health card knows about this deployment's own settings. Shared by
// the admin pages and the hourly health check, so both judge the same way.

import 'server-only'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { APP_ENV, SITE_INDEXABLE } from '@/config/env'
import { SITE_URL } from '@/config/site'
import { BUILD_COMMIT, INTEGRATIONS } from '@/config/integrations'
import type { StatusContext } from './status'

export function statusContext(): StatusContext {
  return {
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
  }
}

/**
 * Whether the server key actually opens this database (a key copied from
 * another project is "set" but useless). Null when there's no key to try.
 */
export async function serverKeyWorks(): Promise<boolean | null> {
  if (!SUPABASE_SECRET_CONFIGURED || !SUPABASE_CONFIGURED) return null
  try {
    const { error } = await createAdminClient().from('shop_settings').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

/** The context with the server key tried for real. */
export async function checkedStatusContext(): Promise<StatusContext> {
  return { ...statusContext(), secretKeyWorks: await serverKeyWorks() }
}
