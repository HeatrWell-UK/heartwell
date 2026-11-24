'use client'

// Claims the ad-visitor offer when a page opens from an ad link (see
// src/lib/offers/paid.ts), and starts the welcome offer on the first page a
// visitor opens, whichever it is (src/lib/offers/welcome.ts). Renders nothing.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { claimOfferFromAd, claimSeason, claimWelcome } from '@/lib/offers/browser'
import { eventLive, type EventSettings } from '@/lib/offers/event'

export function OfferCapture({ enabled, welcome, event }: { enabled: boolean; welcome: boolean; event?: EventSettings }) {
  const pathname = usePathname()
  // Run 3: during the season every visitor (new or returning) gets one 14-day window at their first page.
  useEffect(() => {
    if (event && eventLive(event)) void claimSeason(event.generation)
  }, [event, pathname])
  useEffect(() => {
    if (enabled) void claimOfferFromAd()
  }, [enabled, pathname])
  useEffect(() => {
    if (welcome && !(event && eventLive(event))) void claimWelcome()
  }, [welcome, event])
  return null
}
