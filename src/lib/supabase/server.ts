// The request-bound Supabase client: runs as whoever is signed in (an admin)
// or as anon, with row level security deciding what they see.

import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { publicCredentials } from './config'

export async function createClient() {
  const { url, key } = publicCredentials()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component, which can't set cookies. The proxy
          // refreshes the session on every /admin request, so this is safe.
        }
      },
    },
  })
}
