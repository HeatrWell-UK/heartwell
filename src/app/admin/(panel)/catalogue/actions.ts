'use server'

import { updateTag } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { CATALOGUE_TAG } from '@/lib/catalogue/listing'
import { asRecord, checkDraft, DraftSchema, explainCatalogueError, savedNote, savePayload, type DraftProblem } from '@/lib/admin/catalogue-form'
import { readSpecFields } from '@/lib/admin/structure-form'
import { signedUpload, type SignedUpload } from '@/lib/admin/cloudinary'
import type { Json } from '@/types/database'

// Saving, hiding and deleting products. The database function checks the
// admin again and does the whole save in one transaction; afterwards the
// shop's cached catalogue is expired so the change shows on the next visit.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SaveResult = { ok: true; id: string; slug: string; removed: number; hidden: number; message: string } | { ok: false; message: string; problems?: DraftProblem[] }
export type SimpleResult = { ok: true; message: string } | { ok: false; message: string }

const SIGN_IN = 'Please sign in again.'

export async function saveProduct(input: unknown): Promise<SaveResult> {
  if (await adminGuard()) return { ok: false, message: SIGN_IN }
  const parsed = DraftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Some details are too long or missing. Check the form and try again.' }
  const draft = parsed.data

  const supabase = await createClient()
  const [type, current] = await Promise.all([
    supabase.from('product_types').select('spec_fields').eq('slug', draft.productType).maybeSingle(),
    draft.id ? supabase.from('products').select('specifications').eq('id', draft.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  if (type.error || current.error) return { ok: false, message: 'Couldn’t reach the database. Try again.' }
  if (!type.data) return { ok: false, message: explainCatalogueError('UNKNOWN_TYPE') }
  if (draft.id && !current.data) return { ok: false, message: explainCatalogueError('NOT_FOUND') }

  const fields = readSpecFields(type.data.spec_fields)
  const problems = checkDraft(draft, fields)
  if (problems.length) return { ok: false, message: problems[0]!.message, problems }

  const { data, error } = await supabase.rpc('admin_save_product', { p: savePayload(draft, fields, asRecord(current.data?.specifications)) as unknown as Json })
  if (error) return { ok: false, message: explainCatalogueError(error.message) }
  updateTag(CATALOGUE_TAG)

  const r = data as { id: string; slug: string; colourways_hidden: number; colourways_deleted: number }
  return { ok: true, id: r.id, slug: r.slug, removed: r.colourways_deleted, hidden: r.colourways_hidden, message: savedNote(r.colourways_deleted, r.colourways_hidden) }
}

export async function setProductShown(id: string, shown: boolean): Promise<SimpleResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown product.' }
  if (await adminGuard()) return { ok: false, message: SIGN_IN }
  const { error } = await (await createClient()).from('products').update({ is_active: shown }).eq('id', id)
  if (error) return { ok: false, message: explainCatalogueError(error.message) }
  updateTag(CATALOGUE_TAG)
  return { ok: true, message: shown ? 'Shown in the shop again.' : 'Hidden from the shop. Orders and history are kept.' }
}

export async function deleteProduct(id: string): Promise<SimpleResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown product.' }
  if (await adminGuard()) return { ok: false, message: SIGN_IN }
  const { data, error } = await (await createClient()).rpc('admin_delete_product', { p_product_id: id })
  if (error) return { ok: false, message: explainCatalogueError(error.message) }
  updateTag(CATALOGUE_TAG)
  return { ok: true, message: `Deleted ${(data as { slug?: string } | null)?.slug ?? 'the product'}.` }
}

/** Signed fields for one direct upload to Cloudinary, or a reason there's no upload. */
export async function signPhotoUpload(): Promise<({ ok: true } & SignedUpload) | { ok: false; message: string }> {
  if (await adminGuard()) return { ok: false, message: SIGN_IN }
  const signed = signedUpload()
  if (!signed) return { ok: false, message: 'Uploads aren’t set up yet. Pick a photo from the library or paste a Cloudinary link.' }
  return { ok: true, ...signed }
}
