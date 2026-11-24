// Offer settings for the shop (shop_settings and offer_codes), cached with
// the other settings and expired by every admin save.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient, SUPABASE_SECRET_CONFIGURED } from '@/lib/supabase/admin'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { SETTINGS_TAG } from '@/lib/product/load'
import type { ChristmasFacts } from '@/lib/delivery/christmas'
import { eventLive, NO_EVENT, type EventSettings } from './event'
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
  /** The Christmas and New Year sofa event (migration seasonal_event). */
  event: EventSettings
  christmas: ChristmasFacts
}

const NO_FACTS: ChristmasFacts = { lastDeliveryDate: null, closedDates: [], madeToOrderLeadDays: null, maxWorkingDays: 4, noDeliveryDays: [1] }

const NONE: OfferSettings = {
  adOffer: false,
  days: 7,
  amounts: { HIGH: 0, MID: 0, STANDARD: 0 },
  code: null,
  welcome: { enabled: false, amount: 0, hours: 48 },
  minOrder: 0,
  event: NO_EVENT,
  christmas: NO_FACTS,
}

export const getOfferSettings = unstable_cache(
  async (): Promise<OfferSettings> => {
    if (!SUPABASE_CONFIGURED) return NONE
    const db = createPublicClient()
    const BASE = 'paid_offer_enabled, paid_offer_days, offer_tier_high, offer_tier_mid, offer_tier_standard, welcome_offer_enabled, welcome_offer_amount, welcome_offer_hours, min_order_value, delivery_max_working_days, no_delivery_days'
    const EVENT = 'event_enabled, event_name, event_starts_at, event_ends_at, event_mto_amount, christmas_last_delivery_date, christmas_closed_dates, made_to_order_lead_days, offer_window_hours, offer_generation'
    let { data, error } = await db.from('shop_settings').select(`${BASE}, ${EVENT}`).single()
    if (error) {
      // Before migration seasonal_event is applied the event's columns don't exist:
      // keep every other offer working and show no event (the database applies none either).
      const old = await db.from('shop_settings').select(BASE).single()
      data = old.data ? ({ ...old.data, event_enabled: false, event_name: '', event_starts_at: NO_EVENT.startsAt, event_ends_at: NO_EVENT.endsAt, event_mto_amount: 0, christmas_last_delivery_date: null, christmas_closed_dates: [], made_to_order_lead_days: null, offer_window_hours: 336, offer_generation: '' } as typeof data) : null
      error = old.error
    }
    if (error || !data) return NONE
    // Offer codes are admin-only in the database, so the newest live one is read with the server key.
    // The event's dated aliases (CHRISTMAS, NEWYEAR) aren't the ad visitor's code: the event needs none.
    let code: string | null = null
    if (SUPABASE_SECRET_CONFIGURED) {
      const admin = createAdminClient()
      let codes = await admin.from('offer_codes').select('code').eq('is_active', true).eq('is_event_alias', false).order('created_at', { ascending: false }).limit(1)
      // Before migration seasonal_event (no is_event_alias column yet).
      if (codes.error) codes = await admin.from('offer_codes').select('code').eq('is_active', true).order('created_at', { ascending: false }).limit(1)
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
      event: {
        enabled: data.event_enabled === true,
        name: data.event_name ?? '',
        startsAt: data.event_starts_at,
        endsAt: data.event_ends_at,
        mtoAmount: Number(data.event_mto_amount),
        windowHours: Number(data.offer_window_hours ?? 336),
        generation: data.offer_generation ?? '',
      },
      christmas: {
        lastDeliveryDate: data.christmas_last_delivery_date ?? null,
        closedDates: data.christmas_closed_dates ?? [],
        madeToOrderLeadDays: data.made_to_order_lead_days ?? null,
        maxWorkingDays: Number(data.delivery_max_working_days ?? 4),
        noDeliveryDays: data.no_delivery_days ?? [1],
      },
    }
  },
  ['offer-settings-v3'],
  { revalidate: 300, tags: [SETTINGS_TAG] },
)

/** Only what the shop's pages need in the browser. */
/**
 * Only what the shop's pages need in the browser. While the season is on (Run 3),
 * the 48-hour welcome offer isn't used: the seasonal window replaces it.
 */
export const shopOffers = (s: OfferSettings, now: Date = new Date()): ShopOffers => ({
  amounts: s.amounts,
  code: s.code,
  welcome: eventLive(s.event, now) ? { ...s.welcome, enabled: false } : s.welcome,
  minOrder: s.minOrder,
  event: s.event,
  christmas: s.christmas,
})
