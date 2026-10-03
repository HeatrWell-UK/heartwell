// An anonymous client with no request attached, so its results are the same
// for every visitor and can be cached. Use it only for public data (the
// catalogue, settings, approved reviews), which is all RLS lets anon read.

import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { publicCredentials } from './config'

export function createPublicClient() {
  const { url, key } = publicCredentials()
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
