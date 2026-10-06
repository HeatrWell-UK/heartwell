'use server'

import { updateTag } from 'next/cache'
import { adminGuard } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { CATALOGUE_TAG } from '@/lib/catalogue/listing'
import {
  categoryRow,
  checkCategory,
  checkCollection,
  checkRange,
  checkType,
  collectionRow,
  explainStructureError,
  materialRows,
  rangeRow,
  typeRow,
  type CategoryDraft,
  type CollectionDraft,
  type RangeDraft,
  type TypeDraft,
} from '@/lib/admin/structure-form'

// Product types, categories, ranges and the material library. Writes go
// through the admin's own session: row level security lets only admins
// change these tables, and the database's checks back every rule.

export type StructureResult = { ok: true; id: string; message: string } | { ok: false; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGN_IN: StructureResult = { ok: false, message: 'Please sign in again.' }
const SAVED = 'Saved. The shop shows it on the next visit.'

type Table = 'product_types' | 'categories' | 'ranges' | 'material_collections'

/** Insert or update one row, returning its id. */
async function upsertRow(table: Table, id: string | null, row: Record<string, unknown>): Promise<StructureResult> {
  const supabase = await createClient()
  const query = id ? supabase.from(table).update(row as never).eq('id', id) : supabase.from(table).insert(row as never)
  const { data, error } = await query.select('id').single()
  if (error) return { ok: false, message: explainStructureError(error.message, error.code) }
  updateTag(CATALOGUE_TAG)
  return { ok: true, id: (data as { id: string }).id, message: SAVED }
}

async function deleteRow(table: Table, id: string, what: string): Promise<StructureResult> {
  if (!UUID.test(id)) return { ok: false, message: 'Unknown item.' }
  if (await adminGuard()) return SIGN_IN
  const { error, count } = await (await createClient()).from(table).delete({ count: 'exact' }).eq('id', id)
  if (error) return { ok: false, message: explainStructureError(error.message, error.code) }
  if (!count) return { ok: false, message: 'Already deleted.' }
  updateTag(CATALOGUE_TAG)
  return { ok: true, id, message: `${what} deleted.` }
}

const isDraft = (d: unknown): d is Record<string, unknown> => Boolean(d) && typeof d === 'object'
const idOf = (d: Record<string, unknown>) => (typeof d.id === 'string' && UUID.test(d.id) ? d.id : null)

export async function saveProductType(input: TypeDraft): Promise<StructureResult> {
  if (await adminGuard()) return SIGN_IN
  if (!isDraft(input) || !Array.isArray(input.specFields) || input.specFields.length > 40) return { ok: false, message: 'Check the form and try again.' }
  const problems = checkType(input)
  if (problems.length) return { ok: false, message: problems[0]! }
  const id = idOf(input)
  const row = typeRow(input)
  // The short name is fixed once a type exists: code and imports may refer to it.
  if (id) delete (row as Partial<typeof row>).slug
  return upsertRow('product_types', id, row)
}

export async function deleteProductType(id: string) {
  return deleteRow('product_types', id, 'Product type')
}

export async function saveCategory(input: CategoryDraft): Promise<StructureResult> {
  if (await adminGuard()) return SIGN_IN
  if (!isDraft(input)) return { ok: false, message: 'Check the form and try again.' }
  const problems = checkCategory(input)
  if (problems.length) return { ok: false, message: problems[0]! }
  if (input.parentId && !UUID.test(input.parentId)) return { ok: false, message: 'Choose the parent from the list.' }
  return upsertRow('categories', idOf(input), categoryRow(input))
}

export async function deleteCategory(id: string) {
  return deleteRow('categories', id, 'Category')
}

export async function saveRange(input: RangeDraft): Promise<StructureResult> {
  if (await adminGuard()) return SIGN_IN
  if (!isDraft(input)) return { ok: false, message: 'Check the form and try again.' }
  const problems = checkRange(input)
  if (problems.length) return { ok: false, message: problems[0]! }
  return upsertRow('ranges', idOf(input), rangeRow(input))
}

export async function deleteRange(id: string) {
  return deleteRow('ranges', id, 'Range')
}

/** A collection and its colours together: colours removed from the form are deleted (orders keep their own copy of the name and code). */
export async function saveCollection(input: CollectionDraft): Promise<StructureResult> {
  if (await adminGuard()) return SIGN_IN
  if (!isDraft(input) || !Array.isArray(input.materials) || input.materials.length > 200) return { ok: false, message: 'Check the form and try again.' }
  const problems = checkCollection(input)
  if (problems.length) return { ok: false, message: problems[0]! }
  const saved = await upsertRow('material_collections', idOf(input), collectionRow(input))
  if (!saved.ok) return saved

  const supabase = await createClient()
  const rows = materialRows(input, saved.id).filter((m) => !('id' in m) || UUID.test(String(m.id)))
  const kept = rows.flatMap((m) => ('id' in m ? [String(m.id)] : []))
  let removal = supabase.from('materials').delete().eq('collection_id', saved.id)
  if (kept.length) removal = removal.not('id', 'in', `(${kept.join(',')})`)
  const removed = await removal
  if (removed.error) return { ok: false, message: explainStructureError(removed.error.message, removed.error.code) }
  if (rows.length) {
    const { error } = await supabase.from('materials').upsert(rows, { onConflict: 'id', defaultToNull: false })
    if (error) return { ok: false, message: explainStructureError(error.message, error.code) }
  }
  updateTag(CATALOGUE_TAG)
  return { ok: true, id: saved.id, message: SAVED }
}

export async function deleteCollection(id: string) {
  return deleteRow('material_collections', id, 'Collection and its colours')
}
