// The secret-key client. It bypasses row level security, so it lives only on
// the server and is used only for the server's own work (placing an order,
// recording attribution, sending conversions), never for anything a visitor
// could ask for directly.

import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_URL, SupabaseNotConfiguredError } from './config'

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? ''

export const SUPABASE_SECRET_CONFIGURED = SUPABASE_URL !== '' && SECRET_KEY !== ''

export function createAdminClient() {
  if (!SUPABASE_SECRET_CONFIGURED) throw new SupabaseNotConfiguredError('SUPABASE_SECRET_KEY')
  return createSupabaseClient<Database>(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
