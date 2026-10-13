import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { buildStatusChecks, feedSummary, type AdminStatusData } from './status'
import { checkedStatusContext } from './status-context'

/** Everything the Home and Status pages show, from the database's one status snapshot. */
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

  const checks = buildStatusChecks(await checkedStatusContext(), data, dbError, feedSummary(data))
  return { data, checks }
}
