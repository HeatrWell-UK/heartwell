'use client'

// Claims the ad-visitor offer when a page opens from an ad link (see
// src/lib/offers/paid.ts). Renders nothing.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { claimOfferFromAd } from '@/lib/offers/browser'

export function OfferCapture({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()
  useEffect(() => {
    if (enabled) void claimOfferFromAd()
  }, [enabled, pathname])
  return null
}
