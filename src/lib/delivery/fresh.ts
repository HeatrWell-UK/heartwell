'use client'

// Today's delivery dates on a cached page (audit A4). Product and category
// pages are built ahead and rebuilt at most every five minutes, so the first
// visitor after a quiet night could see yesterday's dates. The page says which
// UK day its dates are for; once it's running in the browser, a different day
// brings fresh dates, worked out by the same rules (src/lib/delivery/window.ts).

import { useMemo, useSyncExternalStore } from 'react'
import { deliveryWindow, earliestPreferredDate, londonToday, type WindowSettings } from './window'
import type { AreaDelivery } from '@/lib/product/types'

export interface DeliveryDates {
  /** "Tue 3 – Thu 5 November". */
  windowLabel: string
  areas: AreaDelivery[]
  /** The UK day (YYYY-MM-DD) these dates were worked out for. */
  day: string
  settings: WindowSettings
}

const noSubscription = () => () => {}
const today = () => londonToday().toISOString().slice(0, 10)

export function useTodaysDelivery(dates: DeliveryDates): Pick<DeliveryDates, 'windowLabel' | 'areas'> {
  // The page's own day while it hydrates (so it matches the HTML), then the browser's.
  const day = useSyncExternalStore(noSubscription, today, () => dates.day)
  return useMemo(() => {
    if (day === dates.day) return dates
    const now = new Date()
    return {
      windowLabel: deliveryWindow(dates.settings, now).label,
      areas: dates.areas.map((a) => ({ ...a, windowLabel: deliveryWindow(dates.settings, now, a).label, earliestDate: earliestPreferredDate(dates.settings, now, a) })),
    }
  }, [day, dates])
}
