'use client'

import { openConsentSettings } from '@/lib/tracking/browser'

/** "Cookie settings" in the footer: changing your mind is as easy as the first answer. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Cookie settings
    </button>
  )
}
