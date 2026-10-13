// Whether each outside service has its settings, for the admin Status page.
// Only presence is checked here; values are read where they're used.

const has = (...names: string[]) => names.every((n) => (process.env[n] ?? '') !== '')

export const INTEGRATIONS = {
  /** Hostinger SMTP for order emails (Phase 10). */
  smtp: has('SMTP_PASSWORD'),
  /** Postcode-to-address lookup for checkout (optional; customers can type it). */
  addressLookup: has('ADDRESS_LOOKUP_PROVIDER', 'ADDRESS_LOOKUP_KEY'),
  /** Photo uploads from the admin's product editor (optional; photos can be picked or pasted). */
  photoUploads: has('CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'),
  /** Meta Pixel and Conversions API (Phase 14). */
  metaTracking: has('NEXT_PUBLIC_META_PIXEL_ID', 'META_CAPI_ACCESS_TOKEN'),
} as const

/** The deployed commit, for display only: worked out once at build time in next.config.ts. */
export const BUILD_COMMIT = process.env.HW_BUILD_COMMIT || 'local'
