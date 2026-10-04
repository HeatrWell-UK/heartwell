'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

export async function signOut() {
  if (SUPABASE_CONFIGURED) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/login')
}
