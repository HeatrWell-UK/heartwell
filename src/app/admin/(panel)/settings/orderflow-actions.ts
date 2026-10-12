'use server'

// OrderFlow from the admin: switch automatic sending on or off, send one
// order by hand (a test order goes marked TEST), and read OrderFlow's replies.
// The address and key live in Supabase Vault and never pass through here.

import { revalidatePath } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

type Result = { ok: boolean; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGN_IN: Result = { ok: false, message: 'Please sign in again.' }

interface PushLog {
  status_code: number | null
  outcome: string | null
  error: string | null
  checked_at: string | null
}

/** What OrderFlow said about a push, in words. */
function replyWords(log: PushLog | undefined): Result {
  if (!log || !log.checked_at) return { ok: true, message: 'Sent. OrderFlow’s reply will show here within 15 minutes.' }
  if (log.error) return { ok: false, message: `OrderFlow didn’t accept it: ${log.error}` }
  return { ok: true, message: `OrderFlow accepted it${log.outcome ? ` (${log.outcome})` : ''}.` }
}

export async function setOrderFlow(on: boolean): Promise<Result> {
  if (await adminGuard()) return SIGN_IN
  const db = await createClient()
  if (on) {
    const { data } = await db.rpc('admin_orderflow')
    if (!(data as { configured?: boolean } | null)?.configured) {
      return { ok: false, message: 'Add OrderFlow’s address and key to Supabase Vault first.' }
    }
  }
  const { error } = await db.from('shop_settings').update({ orderflow_enabled: on === true }).eq('id', true)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  revalidatePath('/admin/settings')
  return { ok: true, message: on ? 'On: every real order now goes to OrderFlow when it’s placed and whenever its status changes.' : 'Off: orders stay here only.' }
}

/** Sends one order now, waits a moment for OrderFlow's reply and says what it was. */
export async function sendToOrderFlow(orderId: string): Promise<Result> {
  if (!UUID.test(orderId)) return { ok: false, message: 'Unknown order.' }
  if (await adminGuard()) return SIGN_IN
  const db = await createClient()
  const { data, error } = await db.rpc('admin_orderflow_push', { p_order_id: orderId })
  if (error) return { ok: false, message: `Couldn’t send it: ${error.message}` }
  const r = data as { ok: boolean; reason?: string }
  if (!r.ok) return { ok: false, message: r.reason === 'not_configured' ? 'Add OrderFlow’s address and key to Supabase Vault first.' : 'Couldn’t find that order.' }
  // pg_net sends within a second or two; give OrderFlow a moment to answer.
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await db.rpc('admin_orderflow_collect')
    const log = await db.rpc('admin_orderflow_log', { p_order_id: orderId })
    const latest = ((log.data ?? []) as unknown as PushLog[])[0]
    if (latest?.checked_at) {
      revalidatePath('/admin/settings')
      revalidatePath(`/admin/orders/${orderId}`)
      return replyWords(latest)
    }
  }
  revalidatePath('/admin/settings')
  revalidatePath(`/admin/orders/${orderId}`)
  return replyWords(undefined)
}

export async function checkOrderFlowReplies(): Promise<Result> {
  if (await adminGuard()) return SIGN_IN
  const { data, error } = await (await createClient()).rpc('admin_orderflow_collect')
  if (error) return { ok: false, message: `Couldn’t check: ${error.message}` }
  revalidatePath('/admin/settings')
  return { ok: true, message: data ? `${data} new ${data === 1 ? 'reply' : 'replies'}.` : 'No new replies.' }
}
