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
  purchaseMode: z.enum(['automatic', 'manual']),
  holdMinutes: z.number().int().min(0).max(1440),
})

export async function saveTrackingSettings(input: unknown): Promise<TrackingResult> {
  if (await adminGuard()) return SIGN_IN
  const parsed = Settings.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Check the settings and try again.' }
  const s = parsed.data
  const { error } = await (await createClient())
    .from('shop_settings')
    .update({ tracking_mode: s.mode, purchase_mode: s.purchaseMode, purchase_hold_minutes: s.holdMinutes })
    .eq('id', true)
  if (error) return { ok: false, message: `Couldn’t save: ${error.message}` }
  // The shop reads the mode through the cached settings.
  updateTag(SETTINGS_TAG)
  revalidatePath('/admin/tracking')
  return { ok: true, message: 'Saved. The shop uses it from the next page.' }
}

const WORDS: Record<string, string> = {
  NOT_WAITING: 'That one has already been sent or closed.',
  NOT_FOUND: 'That one has gone.',
  NOT_AUTHORISED: 'Please sign in again.',
}

export async function outboxAction(id: string, action: 'send_now' | 'hold' | 'skip'): Promise<TrackingResult> {
  if (!z.uuid().safeParse(id).success || !['send_now', 'hold', 'skip'].includes(action)) return { ok: false, message: 'Unknown event.' }
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).rpc('admin_outbox_action', { p_id: id, p_action: action })
  if (error) return { ok: false, message: WORDS[error.message.match(/^([A-Z_]+)/)?.[1] ?? ''] ?? `Couldn’t do that: ${error.message}` }
  revalidatePath('/admin/tracking')
  return { ok: true, message: action === 'send_now' ? 'Sending now (within a minute).' : action === 'hold' ? 'Held. Press Send now when ready.' : 'Skipped. It won’t be sent.' }
}
