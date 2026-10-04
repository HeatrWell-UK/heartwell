// TEMPORARY (preview branch only): which catalogue query fails, and why. Removed before merging.
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createPublicClient()
  const checks: Record<string, string> = {}
  const run = async (name: string, q: PromiseLike<{ error: { message: string; code?: string; hint?: string | null } | null }>) => {
    const { error } = await q
    checks[name] = error ? `${error.code ?? ''} ${error.message} ${error.hint ?? ''}`.trim() : 'ok'
  }
  await run('products plain', db.from('products').select('id, slug').limit(1))
  await run('products type', db.from('products').select('id, type:product_types(slug, name, spec_fields, material_kinds)').limit(1))
  await run('products range', db.from('products').select('id, range:ranges(id, slug, name, axis1_name, axis2_name)').limit(1))
  await run('products category', db.from('products').select('id, category:categories!products_primary_category_id_fkey(id, slug, name)').limit(1))
  await run(
    'category parent',
    db.from('products').select('id, category:categories!products_primary_category_id_fkey(id, slug, parent:categories!categories_parent_id_fkey(slug, name))').limit(1),
  )
  await run('variants', db.from('products').select('id, variants:product_variants(id, sku)').limit(1))
  await run('product columns', db.from('products').select('dimensions_note, highlights, seo_title, seo_description, gallery_images, specifications').limit(1))
  await run('settings', db.from('shop_settings').select('delivery_min_working_days').single())
  await run('reviews', db.from('reviews').select('customer_name').eq('is_approved', true).limit(1))
  await run('collections', db.from('material_collections').select('slug, materials(id)').limit(1))
  return Response.json(checks)
}
