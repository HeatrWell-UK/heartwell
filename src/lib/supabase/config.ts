// Supabase connection settings, read once. Missing settings are reported (the
// admin Status page and /api/health say so) rather than crashing a page.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

export const SUPABASE_CONFIGURED = SUPABASE_URL !== '' && SUPABASE_PUBLISHABLE_KEY !== ''

export class SupabaseNotConfiguredError extends Error {
  constructor(what = 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
    super(`Supabase is not configured: set ${what}.`)
    this.name = 'SupabaseNotConfiguredError'
  }
}

export function publicCredentials(): { url: string; key: string } {
  if (!SUPABASE_CONFIGURED) throw new SupabaseNotConfiguredError()
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY }
}
