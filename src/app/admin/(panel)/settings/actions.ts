'use server'

import { updateTag } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { SETTINGS_TAG } from '@/lib/product/load'
import { checkSettings, cleanOfferCode, type SettingsDraft } from '@/lib/admin/settings-form'
import { checkArea, checkNoDeliveryDays, type AreaDraft } from '@/lib/admin/delivery-areas-form'

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
  // Ad visitors are shown the newest live code, which the shop caches with the settings.
  updateTag(SETTINGS_TAG)
  return { ok: true, message: `${code} is live.` }
}

/** The automatic offer for ad visitors. Off stops new offers; ones already given run to their date. */
export async function setAdOffer(on: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).from('shop_settings').update({ paid_offer_enabled: on === true }).eq('id', true)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: on ? 'Ad visitors get the offer again.' : 'Switched off. Offers already given still apply until their date.' }
}

/** The welcome offer. Off stops new ones and takes it off checkout straight away (the countdowns go too). */
export async function setWelcomeOffer(on: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).from('shop_settings').update({ welcome_offer_enabled: on === true }).eq('id', true)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: on ? 'Every visitor gets the welcome offer again.' : 'Switched off. The welcome offer and its countdown are gone from the shop and checkout.' }
}

export async function setOfferCodeActive(rawCode: string, active: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const code = cleanOfferCode(String(rawCode ?? ''))
  if (!code) return { ok: false, message: 'Unknown code.' }
  const { error } = await (await createClient()).from('offer_codes').update({ is_active: active }).eq('code', code)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: active ? `${code} is live again.` : `${code} is switched off.` }
}

export async function deleteOfferCode(rawCode: string): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const code = cleanOfferCode(String(rawCode ?? ''))
  if (!code) return { ok: false, message: 'Unknown code.' }
  // Orders keep the code as text, so deleting it never changes an order.
  const { error } = await (await createClient()).from('offer_codes').delete().eq('code', code)
  if (error) return { ok: false, message: `Couldn’t delete it: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: `${code} deleted.` }
}

// Delivery areas (17 October 2026) ------------------------------------------
// The mainland areas that pay a delivery charge, and the days nothing is
// delivered. The database refuses a district that's already in another area.

export async function saveDeliveryArea(input: AreaDraft, isNew: boolean): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  if (!input || typeof input !== 'object') return { ok: false, message: 'Check the form and try again.' }
  const { problems, row } = checkArea(input)
  if (!row) return { ok: false, message: problems[0]!, problems }
  const db = await createClient()
  const { error } = isNew
    ? await db.from('delivery_areas').insert({ ...row, sort: 100 })
    : await db.from('delivery_areas').update(row).eq('slug', row.slug)
  if (error) {
    const clash = error.message.match(/DISTRICT_IN_TWO_AREAS: (\S+)/)?.[1]
    if (clash) return { ok: false, message: `${clash} is already in another area. Take it out of that one first.` }
    if (error.code === '23505') return { ok: false, message: `There’s already an area called ${row.name}.` }
    return { ok: false, message: `Couldn’t save: ${error.message}` }
  }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: `${row.name} saved. Checkout and product pages use it from the next visit.` }
}

export async function deleteDeliveryArea(slug: string): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).from('delivery_areas').delete().eq('slug', String(slug ?? ''))
  if (error) return { ok: false, message: `Couldn’t delete it: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: 'Deleted. Delivery there is free from the next visit.' }
}

export async function saveNoDeliveryDays(days: number[]): Promise<SettingsResult> {
  if (await adminGuard()) return SIGN_IN
  const clean = checkNoDeliveryDays(days)
  if (!clean) return { ok: false, message: 'At least one day must have deliveries.' }
  const { error } = await (await createClient()).from('shop_settings').update({ no_delivery_days: clean }).eq('id', true)
  if (error) return { ok: false, message: `Couldn’t save: ${error.message}` }
  updateTag(SETTINGS_TAG)
  return { ok: true, message: 'Saved. Customers can’t pick those days from the next visit.' }
}
