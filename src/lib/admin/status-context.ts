// What the Health card knows about this deployment's own settings. Shared by
// the admin pages and the hourly health check, so both judge the same way.

import 'server-only'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
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
