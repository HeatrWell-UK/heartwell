'use server'

import { updateTag } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { SETTINGS_TAG } from '@/lib/product/load'
import { checkSettings, cleanOfferCode, type SettingsDraft } from '@/lib/admin/settings-form'

// Shop settings and offer codes. Row level security lets only admins change
// them; the database's own checks back every rule. Delivery prices and dates
// are cached by the shop, so the settings cache is expired after each save.

export type SettingsResult = { ok: true; message: string } | { ok: false; message: string; problems?: string[] }

const SIGN_IN: SettingsResult = { ok: false, message: 'Please sign in again.' }

export async function saveSettings(input: SettingsDraft): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  if (!input || typeof input !== 'object') return { ok: false, message: 'Check the form and try again.' }
  const { problems, row } = checkSettings(input)
  if (!row) return { ok: false, message: problems[0]!, problems }
  const { error } = await (await createClient()).from('shop_settings').update(row).eq('id', true)
  if (error) return { ok: false, message: `Couldn’t save: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: 'Saved. Checkout and product pages use the new figures from the next visit.' }
}

export async function addOfferCode(rawCode: string, rawLabel: string): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const code = cleanOfferCode(String(rawCode ?? ''))
  if (!code) return { ok: false, message: 'A code is 4 to 24 letters and numbers, e.g. WELCOME50.' }
  const label = String(rawLabel ?? '').trim().slice(0, 120) || null
  const { error } = await (await createClient()).from('offer_codes').insert({ code, label, is_active: true })
  if (error) return { ok: false, message: error.code === '23505' ? `${code} already exists.` : `Couldn’t add it: ${error.message}` }
  return { ok: true, message: `${code} is live.` }
}

export async function setOfferCodeActive(rawCode: string, active: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const code = cleanOfferCode(String(rawCode ?? ''))
  if (!code) return { ok: false, message: 'Unknown code.' }
  const { error } = await (await createClient()).from('offer_codes').update({ is_active: active }).eq('code', code)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  return { ok: true, message: active ? `${code} is live again.` : `${code} is switched off.` }
}

export async function deleteOfferCode(rawCode: string): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const code = cleanOfferCode(String(rawCode ?? ''))
  if (!code) return { ok: false, message: 'Unknown code.' }
  // Orders keep the code as text, so deleting it never changes an order.
  const { error } = await (await createClient()).from('offer_codes').delete().eq('code', code)
  if (error) return { ok: false, message: `Couldn’t delete it: ${error.message}` }
  return { ok: true, message: `${code} deleted.` }
}
