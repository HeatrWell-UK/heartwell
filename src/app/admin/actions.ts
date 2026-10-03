'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { safeNextPath } from '@/lib/http/origin'

export interface SignInState {
  error: string | null
  email: string
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!SUPABASE_CONFIGURED) return { error: 'Sign-in isn’t available because the database isn’t connected.', email }
  if (!email || !password) return { error: 'Enter your email address and password.', email }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'That email address and password don’t match an account.', email }

  // Link the account to the admin list (only a confirmed, allowlisted email can).
  const { data: isAdmin, error: claimError } = await supabase.rpc('claim_admin')
  if (claimError || isAdmin !== true) {
    await supabase.auth.signOut()
    return { error: 'This account isn’t on the admin list.', email }
  }

  redirect(safeNextPath(formData.get('next')))
}

export async function signOut() {
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/admin/login')
}
