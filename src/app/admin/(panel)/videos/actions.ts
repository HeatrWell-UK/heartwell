'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { CATALOGUE_TAG } from '@/lib/catalogue/listing'
import { signedUpload, type SignedUpload } from '@/lib/admin/cloudinary'
import { cloudinaryVideo, VIDEO_KINDS } from '@/lib/videos'

// Product videos: a Cloudinary video link, the product it shows, who made it
// and a caption. Shown on the product page while active.

export type VideoResult = { ok: true; message: string } | { ok: false; message: string }

const SIGN_IN: VideoResult = { ok: false, message: 'Please sign in again.' }

const Input = z.object({
  id: z.uuid().nullable(),
  url: z.string().trim().max(500),
  productId: z.union([z.uuid(), z.literal('')]),
  kind: z.enum(VIDEO_KINDS.map((k) => k.value) as ['customer', 'studio', 'warehouse']),
  caption: z.string().trim().max(200),
  sort: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
})

export async function saveVideo(input: unknown): Promise<VideoResult> {
  if (await adminGuard()) return SIGN_IN
  const parsed = Input.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Check the form and try again.' }
  const v = parsed.data
  const video = cloudinaryVideo(v.url)
  if (!video) return { ok: false, message: 'Paste a Cloudinary video link (it has /video/upload/ in it), or upload one.' }
  const row = {
    url: v.url,
    public_id: video.publicId,
    product_id: v.productId || null,
    kind: v.kind,
    caption: v.caption || null,
    sort: v.sort,
    is_active: v.isActive,
  }
  const db = await createClient()
  const { error } = v.id ? await db.from('videos').update(row).eq('id', v.id) : await db.from('videos').insert(row)
  if (error) return { ok: false, message: `Couldn’t save it: ${error.message}` }
  updateTag(CATALOGUE_TAG)
  revalidatePath('/admin/videos')
  return { ok: true, message: v.id ? 'Saved.' : 'Added.' }
}

export async function deleteVideo(id: string): Promise<VideoResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: 'Unknown video.' }
  if (await adminGuard()) return SIGN_IN
  const { error } = await (await createClient()).from('videos').delete().eq('id', id)
  if (error) return { ok: false, message: `Couldn’t delete it: ${error.message}` }
  updateTag(CATALOGUE_TAG)
  revalidatePath('/admin/videos')
  return { ok: true, message: 'Deleted. The file stays in Cloudinary.' }
}

export async function signVideoUpload(): Promise<({ ok: true } & SignedUpload) | { ok: false; message: string }> {
  if (await adminGuard()) return { ok: false, message: 'Please sign in again.' }
  const signed = signedUpload('video')
  if (!signed) return { ok: false, message: 'Uploads aren’t set up yet. Paste a Cloudinary video link instead.' }
  return { ok: true, ...signed }
}
