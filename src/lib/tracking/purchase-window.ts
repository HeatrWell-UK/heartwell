// How long a held Purchase can still reach Meta (Run 2, owner 24 November
// 2026). The Conversions API refuses events older than 7 days (event_time is
// the order's confirmation time, tooOldForMeta in meta-event.ts), so a
// Purchase left waiting is silently lost after that. Pure: shared by the
// admin pages and tests.

const DAY = 24 * 60 * 60 * 1000
/** The same limit tooOldForMeta uses: 7 days less a minute. */
export const META_WINDOW_MS = 7 * DAY - 60_000

export interface PurchaseWindow {
  /** The last moment Meta accepts it. */
  expiresAt: Date
  /** Whole days left (rounded down); 0 on its last day. */
  daysLeft: number
  hoursLeft: number
  expired: boolean
  /** Two days or less: say it loudly. */
  urgent: boolean
}

export function purchaseWindow(confirmedAt: string | Date | null | undefined, now: Date = new Date()): PurchaseWindow | null {
  if (!confirmedAt) return null
  const t = typeof confirmedAt === 'string' ? Date.parse(confirmedAt) : confirmedAt.getTime()
  if (!Number.isFinite(t)) return null
  const expiresAt = new Date(t + META_WINDOW_MS)
  const left = expiresAt.getTime() - now.getTime()
  return {
    expiresAt,
    daysLeft: Math.max(0, Math.floor(left / DAY)),
    hoursLeft: Math.max(0, Math.floor(left / (60 * 60 * 1000))),
    expired: left <= 0,
    urgent: left > 0 && left <= 2 * DAY,
  }
}

/** "Meta accepts it for 3 more days", "…for 14 more hours", or "Too old for Meta now (over 7 days)". */
export function purchaseWindowText(w: PurchaseWindow): string {
  if (w.expired) return 'Too old for Meta now (over 7 days since it was confirmed)'
  if (w.hoursLeft < 48) return `Meta accepts it for ${w.hoursLeft} more ${w.hoursLeft === 1 ? 'hour' : 'hours'}`
  return `Meta accepts it for ${w.daysLeft} more days`
}

/** Plain words for an outbox note on a Purchase Meta already has. */
export const OUTBOX_NOTE: Record<string, string> = {
  sent_then_held: 'Sent to Meta, then the order went on hold. Meta can’t take it back; nothing is resent.',
  sent_then_cancelled: 'Sent to Meta, then the order was cancelled. Meta can’t take it back; nothing is resent.',
}
