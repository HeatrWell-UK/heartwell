'use client'

// Claims the ad-visitor offer when a page opens from an ad link (see
// src/lib/offers/paid.ts), and starts the welcome offer on the first page a
// visitor opens, whichever it is (src/lib/offers/welcome.ts). Renders nothing.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { claimOfferFromAd, claimWelcome } from '@/lib/offers/browser'

export function OfferCapture({ enabled, welcome }: { enabled: boolean; welcome: boolean }) {
  const pathname = usePathname()
  useEffect(() => {
    if (enabled) void claimOfferFromAd()
  }, [enabled, pathname])
  useEffect(() => {
    if (welcome) void claimWelcome()
  }, [welcome])
  return null
}
