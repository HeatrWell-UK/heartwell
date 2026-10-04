'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { safeNextPath } from '@/lib/http/origin'

export interface SignInState {
  error: string | null
  email: string
}

// One message for every failed sign-in, so the page never reveals which
// accounts exist or that anything sits behind it.
const NO_MATCH = 'That email address and password don’t match. Please check them and try again.'

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) return { error: 'Enter your email address and password.', email }
  if (!SUPABASE_CONFIGURED) return { error: 'Signing in isn’t available right now. Please try again later.', email }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: NO_MATCH, email }

  // Only an allowlisted admin account may stay signed in.
  const { data: isAdmin, error: claimError } = await supabase.rpc('claim_admin')
  if (claimError || isAdmin !== true) {
    await supabase.auth.signOut()
    return { error: NO_MATCH, email }
  }

  redirect(safeNextPath(formData.get('next')))
}
