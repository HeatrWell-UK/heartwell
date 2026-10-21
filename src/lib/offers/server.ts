// Offer settings for the shop (shop_settings and offer_codes), cached with
// the other settings and expired by every admin save.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { SETTINGS_TAG } from '@/lib/product/load'
import type { TierAmounts } from './paid'
import type { ShopOffers, WelcomeSettings } from './welcome'

export interface OfferSettings {
  /** The automatic offer for ad visitors is on. */
  adOffer: boolean
  days: number
  amounts: TierAmounts
  /** The newest live offer code, shown to ad visitors for use on another device. Null when none is live. */
  code: string | null
  /** Every visitor's welcome offer (a fixed amount off each piece for the first hours). */
  welcome: WelcomeSettings
  /** The least a website order's pieces can come to, before offers and delivery. */
  minOrder: number
}

const NONE: OfferSettings = {
  adOffer: false,
  days: 7,
  amounts: { HIGH: 0, MID: 0, STANDARD: 0 },
  code: null,
  welcome: { enabled: false, amount: 0, hours: 48 },
  minOrder: 0,
}

export const getOfferSettings = unstable_cache(
  async (): Promise<OfferSettings> => {
    if (!SUPABASE_CONFIGURED) return NONE
    const { data, error } = await createPublicClient()
      .from('shop_settings')
      .select('paid_offer_enabled, paid_offer_days, offer_tier_high, offer_tier_mid, offer_tier_standard, welcome_offer_enabled, welcome_offer_amount, welcome_offer_hours, min_order_value')
      .single()
    if (error || !data) return NONE
    // Offer codes are admin-only in the database, so the newest live one is read with the server key.
    let code: string | null = null
    if (SUPABASE_SECRET_CONFIGURED) {
      const codes = await createAdminClient().from('offer_codes').select('code').eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      code = codes.data?.[0]?.code ?? null
    }
    const welcomeAmount = Number(data.welcome_offer_amount)
    return {
      adOffer: data.paid_offer_enabled,
      days: data.paid_offer_days,
      amounts: { HIGH: Number(data.offer_tier_high), MID: Number(data.offer_tier_mid), STANDARD: Number(data.offer_tier_standard) },
      code,
      welcome: { enabled: data.welcome_offer_enabled && welcomeAmount > 0, amount: welcomeAmount, hours: data.welcome_offer_hours },
      minOrder: Number(data.min_order_value),
    }
  },
  ['offer-settings-v2'],
  { revalidate: 300, tags: [SETTINGS_TAG] },
)

/** Only what the shop's pages need in the browser. */
export const shopOffers = (s: OfferSettings): ShopOffers => ({ amounts: s.amounts, code: s.code, welcome: s.welcome, minOrder: s.minOrder })
