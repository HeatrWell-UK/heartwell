'use server'

import { updateTag } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { SETTINGS_TAG } from '@/lib/product/load'
import { checkSeason, type SeasonDraft } from '@/lib/admin/season-form'
import type { SettingsResult } from './actions'

// The Christmas and New Year season (Run 3). admin_save_season checks the
// admin and the figures again; a new generation gives every visitor one fresh
// 14-day window (old windows are archived without their tokens when used).

export async function saveSeason(input: SeasonDraft): Promise<SettingsResult> {
  if (await adminGuard()) return { ok: false, message: 'Please sign in again.' }
  if (!input || typeof input !== 'object') return { ok: false, message: 'Check the form and try again.' }
  const { problems, input: row } = checkSeason(input)
  if (!row) return { ok: false, message: problems[0]!, problems }
  const { error } = await (await createClient()).rpc('admin_save_season', { p_input: row })
  if (error) {
    const known: Record<string, string> = { SEASON_DATES: 'The end must be after the start.', SEASON_HOURS: 'Each visitor’s window is between 1 hour and 90 days.' }
    return { ok: false, message: known[error.message] ?? `Couldn’t save: ${error.message}` }
  }
  updateTag(SETTINGS_TAG)
  return {
    ok: true,
    message: row.new_generation
      ? 'Saved, with a new generation: every visitor gets one fresh window on their next visit.'
      : 'Saved. The shop uses the new dates from the next page view.',
  }
}
