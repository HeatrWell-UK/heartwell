import 'server-only'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'
import { fromPrice, unitPrice } from '@/lib/catalogue/pricing'
import { fabricLabel, productHref } from '@/lib/product/helpers'
import type { ProductCardView } from '@/lib/product/types'
import type { OfferTier } from '@/lib/offers/paid'
import { MAX_LINES, MAX_SAVED, type BasketLineView } from './model'

export const BasketIdentities = z
  .array(z.object({ id: z.string().min(1).max(64), variantId: z.uuid(), materialId: z.uuid().nullable() }))
  .max(MAX_LINES)

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))

/**
 * Current title, photo and price for each basket line, read from the public
 * catalogue. null means the line can no longer be bought (the colourway or
 * fabric was withdrawn, or the fabric isn't offered for that piece).
 */
export async function freshBasketViews(lines: z.infer<typeof BasketIdentities>): Promise<Record<string, BasketLineView | null>> {
  if (lines.length === 0) return {}
  const db = createPublicClient()
  const variantIds = [...new Set(lines.map((l) => l.variantId))]
  const materialIds = [...new Set(lines.map((l) => l.materialId).filter((m): m is string => m !== null))]

  const [variants, materials] = await Promise.all([
    db
      .from('product_variants')
      .select('id, sku, colour_name, price_adjustment, image_url, product:products(slug, title, base_price, made_to_order, gallery_images, type:product_types(material_kinds), tier:offer_product_tiers(tier))')
      .in('id', variantIds),
    materialIds.length
      ? db.from('materials').select('id, code, name, collection:material_collections(name, kind, surcharge)').in('id', materialIds)
      : null,
  ])
  if (variants.error) throw new Error(`Basket: ${variants.error.message}`)
  if (materials?.error) throw new Error(`Basket: ${materials.error.message}`)

  const result: Record<string, BasketLineView | null> = {}
  for (const line of lines) {
    const v = variants.data.find((x) => x.id === line.variantId)
    const product = one(v?.product)
    if (!v || !product) {
      result[line.id] = null
      continue
    }
    let surcharge = 0
    let option = v.colour_name ?? 'As shown'
    if (line.materialId) {
      const m = materials?.data.find((x) => x.id === line.materialId)
      const collection = one(m?.collection)
      const kinds = one(product.type)?.material_kinds ?? []
      if (!m || !collection || !product.made_to_order || !kinds.includes(collection.kind)) {
        result[line.id] = null
        continue
      }
      surcharge = collection.surcharge
      option = fabricLabel(m.name, collection.name, m.code)
    }
    result[line.id] = {
      slug: product.slug,
      sku: v.sku,
      title: product.title,
      option,
      image: v.image_url ?? product.gallery_images[0] ?? null,
      unitPrice: unitPrice(product.base_price, v.price_adjustment, surcharge),
      madeToOrder: product.made_to_order,
      offerTier: (one(product.tier)?.tier ?? null) as OfferTier | null,
    }
  }
  return result
}

export const SavedIdentities = z
  .array(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,200}$/), sku: z.string().max(100).nullable() }))
  .max(MAX_SAVED)

export interface SavedCard extends ProductCardView {
  href: string
}

/** Cards for the saved list, in the colour each was saved in. Withdrawn pieces drop out. */
export async function savedCards(items: z.infer<typeof SavedIdentities>): Promise<SavedCard[]> {
  if (items.length === 0) return []
  const { data, error } = await createPublicClient()
    .from('products')
    .select('slug, title, base_price, variants:product_variants(sku, colour_name, price_adjustment, image_url, sort)')
    .in(
      'slug',
      items.map((i) => i.slug),
    )
  if (error) throw new Error(`Saved: ${error.message}`)
  return items.flatMap((item) => {
    const p = data.find((x) => x.slug === item.slug)
    if (!p) return []
    const vs = [...p.variants].sort((a, b) => a.sort - b.sort)
    const v = vs.find((x) => x.sku === item.sku) ?? vs.find((x) => x.image_url) ?? vs[0]
    return [
      {
        slug: p.slug,
        title: p.title,
        price: v ? unitPrice(p.base_price, v.price_adjustment) : fromPrice(p.base_price, []),
        image: v?.image_url ?? null,
        imageAlt: v?.colour_name ? `${p.title} in ${v.colour_name.toLowerCase()}` : p.title,
        href: productHref(p.slug, v?.sku),
      },
    ]
  })
}
