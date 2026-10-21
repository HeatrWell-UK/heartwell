// The welcome offer (owner, 22 October 2026): every visitor gets a fixed
// amount off each piece for 48 hours from their first visit. The database
// starts the window once per visitor and never restarts or extends it, so the
// countdown is true. Also the minimum order. Pure: shared by the browser, the
// server and tests.

import type { TierAmounts } from './paid'

/** httpOnly: the welcome offer's token, which checkout sends to the database. */
export const WELCOME_COOKIE = 'hw-welcome'
/** Readable by the page: when the welcome offer ends (ISO), for the countdown. */
export const WELCOME_UNTIL_COOKIE = 'hw-welcome-until'
/**
 * Both cookies outlive the offer, so a browser whose offer has ended
 * remembers that (and never asks for a new one) for a year.
 */
export const WELCOME_COOKIE_DAYS = 365

export interface WelcomeSettings {
  enabled: boolean
  /** Pounds off each piece. */
  amount: number
  /** How long it lasts from the first visit. */
  hours: number
}

/** The offer settings the shop's pages need in the browser. */
export interface ShopOffers {
  /** The ad offer's amount for each tier. */
  amounts: TierAmounts
  /** The newest live code, shown to ad visitors for another device. */
  code: string | null
  welcome: WelcomeSettings
  /** The least a website order's pieces can come to, before offers and delivery. */
  minOrder: number
}

/** What the welcome offer takes off: the amount for each piece, never more than the pieces cost. As the database works it out. */
export function welcomeOff(pieces: number, subtotal: number, amount: number): number {
  if (pieces <= 0 || amount <= 0) return 0
  return Math.min(subtotal, Math.round(amount * pieces * 100) / 100)
}

/** Hours and minutes left (rounded down, so it never shows more time than there is); null once it has ended. */
export function timeLeft(ends: Date, now = Date.now()): { hours: number; minutes: number } | null {
  const ms = ends.getTime() - now
  if (!(ms > 0)) return null
  const minutes = Math.floor(ms / 60_000)
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}

/** "47 hours 12 minutes", for screen readers. */
export function timeLeftText(left: { hours: number; minutes: number }): string {
  const part = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
  if (left.hours === 0) return part(left.minutes, 'minute')
  return `${part(left.hours, 'hour')} ${part(left.minutes, 'minute')}`
}

export type OfferKind = 'welcome' | 'ad'

/**
 * One offer per order, the one that takes the most off (a tie keeps the ad
 * offer), as the database decides it. For display; checkout's figure counts.
 */
export function bestOffer(welcome: number, ad: number): { kind: OfferKind | null; amount: number } {
  if (ad > 0 && ad >= welcome) return { kind: 'ad', amount: ad }
  if (welcome > 0) return { kind: 'welcome', amount: welcome }
  return { kind: null, amount: 0 }
}

/** How much more a basket needs to reach the minimum order (0 once it does). The pieces' prices count, before offers and delivery. */
export function shortOfMinimum(subtotal: number, minimum: number): number {
  return Math.max(0, Math.round((minimum - subtotal) * 100) / 100)
}
