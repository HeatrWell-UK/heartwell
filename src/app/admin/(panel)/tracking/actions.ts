'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { SETTINGS_TAG } from '@/lib/product/load'
import { TRACKING_MODES } from '@/config/tracking'

export type TrackingResult = { ok: true; message: string } | { ok: false; message: string }

const SIGN_IN: TrackingResult = { ok: false, message: 'Please sign in again.' }

const Settings = z.object({
  mode: z.enum(TRACKING_MODES as ['dry_run', 'test', 'live']),
})

export async function saveTrackingSettings(input: unknown): Promise<TrackingResult> {
  if (await adminGuard()) return SIGN_IN
  const parsed = Settings.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Check the settings and try again.' }
  const s = parsed.data
  // Purchases are only ever sent by hand (owner, 15 November 2026): every save keeps the mode on manual.
  const { error } = await (await createClient()).from('shop_settings').update({ tracking_mode: s.mode, purchase_mode: 'manual' }).eq('id', true)
  if (error) return { ok: false, message: `Couldn’t save: ${error.message}` }
  // The shop reads the mode through the cached settings.
  updateTag(SETTINGS_TAG)
  revalidatePath('/admin/tracking')
  return { ok: true, message: 'Saved. The shop uses it from the next page.' }
}

const WORDS: Record<string, string> = {
  NOT_WAITING: 'That one has already been sent or closed.',
  NOT_VERIFIED: 'Verify the order first (on its order page): only orders staff have checked with the customer go to Meta.',
  VERIFY_NOT_CONFIRMED: 'Only a confirmed order that isn’t on hold can be verified.',
  NOT_FOUND: 'That one has gone.',
  NOT_AUTHORISED: 'Please sign in again.',
}

/**
 * Staff have spoken to the customer and the details are right: the order
 * becomes a genuine sale, and its Purchase is queued (held for Send).
 */
export async function verifyOrder(id: string): Promise<TrackingResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: 'Unknown order.' }
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).rpc('verify_order', { p_order_id: id })
  if (error) return { ok: false, message: WORDS[error.message.match(/^([A-Z_]+)/)?.[1] ?? ''] ?? `Couldn’t do that: ${error.message}` }
  revalidatePath('/admin/tracking')
  revalidatePath('/admin/today')
  revalidatePath('/admin/orders/[id]', 'page')
  return { ok: true, message: 'Verified. Its Purchase is waiting for Send.' }
}

export async function outboxAction(id: string, action: 'send_now' | 'hold' | 'skip'): Promise<TrackingResult> {
  if (!z.uuid().safeParse(id).success || !['send_now', 'hold', 'skip'].includes(action)) return { ok: false, message: 'Unknown event.' }
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).rpc('admin_outbox_action', { p_id: id, p_action: action })
  if (error) return { ok: false, message: WORDS[error.message.match(/^([A-Z_]+)/)?.[1] ?? ''] ?? `Couldn’t do that: ${error.message}` }
  revalidatePath('/admin/tracking')
  revalidatePath('/admin/orders/[id]', 'page')
  return { ok: true, message: action === 'send_now' ? 'Sending now (within a minute).' : action === 'hold' ? 'Held. Press Send now when ready.' : 'Skipped. It won’t be sent.' }
}
