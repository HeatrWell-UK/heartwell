'use server'

import { notFound, redirect } from 'next/navigation'
import { after } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { sendOrderConfirmedEmail } from './notify'

/** Only a submitted form confirms an order. Opening the link is safe for previews. */
export async function confirmCustomerOrder(id: string, fromReceipt: boolean) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound()
  const path = fromReceipt ? `/order/${id}` : `/confirm-order/${id}`
  if (!rateLimit(`confirm:${await clientIp()}`, 20, 10 * 60_000)) redirect(`${path}?busy=1`)

  const { data, error } = await createPublicClient().rpc('confirm_order', { p_order_id: id })
  if (error) redirect(`${path}?failed=1`)
  if ((data as { just_confirmed?: boolean } | null)?.just_confirmed) {
    after(async () => {
      try {
        await sendOrderConfirmedEmail(id)
      } catch (error) {
        console.error('confirmed email failed', id, error)
      }
    })
  }
  redirect(path)
}
