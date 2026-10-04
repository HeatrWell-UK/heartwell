// Who is using the admin. One definition of "admin", shared with the database:
// a signed-in user whose account is linked in public.admins (is_admin()).

import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

export interface AdminUser {
  userId: string
  email: string
}

export const NOT_AUTHORISED = 'You are not authorised to do that.'

/** The signed-in admin, or null. Cached per request. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  if (!SUPABASE_CONFIGURED) return null
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || isAdmin !== true) return null
  return { userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' }
})

/**
 * For admin pages: the admin, or a redirect to the ordinary sign-in page. A
 * signed-in account that isn't an admin is treated exactly like no account.
 */
export async function requireAdmin(next = '/admin'): Promise<AdminUser> {
  const admin = await getAdmin()
  if (!admin) redirect(next === '/admin' ? '/login' : `/login?next=${encodeURIComponent(next)}`)
  return admin
}

/** For admin Server Actions: null to carry on, or an error to show. */
export async function adminGuard(): Promise<{ error: string } | null> {
  return (await getAdmin()) ? null : { error: NOT_AUTHORISED }
}
