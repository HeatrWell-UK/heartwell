'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { CATALOGUE_TAG } from '@/lib/catalogue/listing'

// Moderation. Approving publishes a review on its product page and /reviews
// (both cached by the catalogue tag, expired here); the database keeps each
// product's count and average up to date itself.

export type ReviewAdminResult = { ok: true; message: string } | { ok: false; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function setReviewApproved(id: string, approved: boolean): Promise<ReviewAdminResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown review.' }
  if (await adminGuard()) return { ok: false, message: 'Please sign in again.' }
  const { error } = await (await createClient())
    .from('reviews')
    .update({ is_approved: approved, approved_at: approved ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, message: `Couldn’t change it: ${error.message}` }
  updateTag(CATALOGUE_TAG)
  revalidatePath('/admin/reviews')
  return { ok: true, message: approved ? 'Published.' : 'Hidden from the shop.' }
}

export async function deleteReview(id: string): Promise<ReviewAdminResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown review.' }
  if (await adminGuard()) return { ok: false, message: 'Please sign in again.' }
  const { error } = await (await createClient()).from('reviews').delete().eq('id', id)
  if (error) return { ok: false, message: `Couldn’t delete it: ${error.message}` }
  updateTag(CATALOGUE_TAG)
  revalidatePath('/admin/reviews')
  return { ok: true, message: 'Deleted.' }
}
