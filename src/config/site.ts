// The site's own address and the customer email address: one setting each, so
// either can change (a new domain, email moving to another domain) without
// touching any other file.

/**
 * The live shop's domain (owner, 15 October 2026). Real tracking only ever
 * runs here (src/config/tracking.ts), whatever NEXT_PUBLIC_SITE_URL says.
 */
export const LIVE_DOMAIN = 'heartwellsofa.co.uk'

/** Canonical origin, no trailing slash. Set NEXT_PUBLIC_SITE_URL per environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || `https://${LIVE_DOMAIN}`).replace(/\/$/, '')

/** Where customers write to us and where every automated email asks them to reply. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'enquiries@heartwellsofa.co.uk'

/** What metadataBase resolves against: localhost in development so local canonicals are honest. */
export const METADATA_BASE = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : SITE_URL
