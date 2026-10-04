// Builds the catalogue import from the local, git-ignored reference folder.
//
//   node scripts/catalogue/build-import.mjs
//
// Writes into reference/.import/ (never committed):
//   images-manifest.json  every image to copy into Heartwell's Cloudinary
//   catalogue.json        the payload for public.import_catalogue()
// and prints a table of parsed dimensions to check by eye, any warnings, and
// the checksums the database must reproduce after the import.
//
// The reference catalogue's descriptions are never read: Heartwell writes its
// own (Phase 17C). Product types and the category tree come from
// src/lib/catalogue/import-config.ts.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  cleanColour,
  cleanHex,
  cleanSlug,
  cleanSpecifications,
  cleanTitle,
  parseDimensions,
  rangeName,
  shapeAndSeats,
  slugify,
} from '../../src/lib/catalogue/clean.ts'
import {
  CATEGORY_MAP,
  CATEGORY_TREE,
  COLLECTION_KIND,
  PRODUCT_TYPES,
  TIER_MAP,
  VARIANT_OVERRIDES,
  sizeRank,
} from '../../src/lib/catalogue/import-config.ts'

const ROOT = new URL('../../', import.meta.url)
const REF = new URL('reference/catalogue/', ROOT)
const OUT = new URL('reference/.import/', ROOT)
mkdirSync(OUT, { recursive: true })

function load(name) {
  const [header, ...rows] = readFileSync(new URL(name, REF), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
  return rows.map((r) => Object.fromEntries(header.map((k, i) => [k, r[i]])))
}

const categories = load('categories.jsonl')
const groups = load('variant_groups.jsonl')
const products = load('products.jsonl')
const variants = load('product_variants.jsonl')
const collections = load('fabric_collections.jsonl')
const fabrics = load('fabrics.jsonl')
const tiers = load('offer_product_tiers.jsonl')

const warnings = []

// ---------------------------------------------------------------------------
// Images: what to copy, and (once copied) where each one now lives.

const FOLDERS = {
  variants: 'heartwell/source/variants',
  gallery: 'heartwell/source/gallery',
  categories: 'heartwell/source/categories',
  fabrics: 'heartwell/source/fabrics',
}
const manifest = new Map()
const want = (path, folder) => {
  if (path && !manifest.has(path)) manifest.set(path, folder)
}
for (const v of variants) want(v.image, FOLDERS.variants)
for (const p of products) for (const g of p.gallery_images ?? []) want(g, FOLDERS.gallery)
for (const c of categories) want(c.image, FOLDERS.categories)
for (const f of fabrics) want(f.image, FOLDERS.fabrics)
writeFileSync(new URL('images-manifest.json', OUT), JSON.stringify([...manifest].map(([path, folder]) => ({ path, folder })), null, 1))

const mapFile = new URL('images-map.json', OUT)
const imageMap = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {}
const image = (path) => {
  if (!path) return null
  if (!imageMap[path]) warnings.push(`image not copied yet: ${path}`)
  return imageMap[path] ?? null
}

// ---------------------------------------------------------------------------
// Categories, ranges, collections

const categoryImage = Object.fromEntries(categories.map((c) => [CATEGORY_MAP[c.slug], c.image]))
const payloadCategories = CATEGORY_TREE.map((c) => ({
  slug: c.slug,
  name: c.name,
  parent_slug: c.parent,
  image_url: image(categoryImage[c.slug]),
  sort: c.sort,
}))

const rangeOf = Object.fromEntries(groups.map((g) => [g.slug, slugify(rangeName(g.name))]))
const payloadRanges = groups.map((g, i) => {
  const members = products.filter((p) => p.variant_group === g.slug)
  return {
    slug: rangeOf[g.slug],
    name: rangeName(g.name),
    axis1_name: 'Size',
    axis2_name: members.some((p) => (p.subgroup_label ?? '').trim()) ? 'Back style' : null,
    sort: i + 1,
  }
})

const payloadCollections = collections.map((c) => ({
  slug: c.slug,
  name: c.name,
  kind: COLLECTION_KIND[c.slug] ?? 'fabric',
  supplier: c.supplier ?? null,
  supplier_handle: c.supplier_handle ?? null,
  sort: c.sort ?? 99,
  is_active: c.is_active !== false,
}))

const payloadMaterials = fabrics.map((f) => ({
  collection: f.collection,
  code: f.code,
  name: f.name,
  supplier_title: f.supplier_title ?? null,
  hex: cleanHex(f.hex),
  image_url: image(f.image),
  sort: f.sort ?? 99,
  is_active: f.is_active !== false,
  is_swatchable: f.is_swatchable !== false,
}))

// ---------------------------------------------------------------------------
// Products

const tierOf = Object.fromEntries(tiers.map((t) => [t.product, TIER_MAP[t.tier]]))
const productSlug = Object.fromEntries(products.map((p) => [p.slug, cleanSlug(p.slug)]))

const payloadProducts = products.map((p) => {
  const title = cleanTitle(p.title)
  const sizeLabel = cleanTitle(p.size_label ?? '')
  const { shape, seats } = shapeAndSeats(sizeLabel || title)
  const type = shape === 'armchair' ? 'armchair' : shape === 'footstool' ? 'footstool' : 'sofa'
  const refCats = [...new Set([p.category, ...(p.categories ?? [])].filter(Boolean))]
  const cats = new Set(refCats.map((c) => CATEGORY_MAP[c]).filter(Boolean))
  if (type !== 'sofa') cats.add('armchairs-and-footstools')
  const primary = type !== 'sofa' ? 'armchairs-and-footstools' : CATEGORY_MAP[p.category]
  if (!primary) warnings.push(`no primary category for ${p.slug}`)

  const specsRaw = p.specifications ?? {}
  const dims = parseDimensions(specsRaw.Dimensions ?? specsRaw.dimensions ?? null)
  const reclining = refCats.includes('electric-sofa') ? 'Electric' : refCats.includes('recliner') ? 'Manual' : null
  const specifications = {
    ...cleanSpecifications(specsRaw),
    shape,
    ...(seats ? { seats } : {}),
    ...(reclining ? { reclining } : {}),
    ...(dims.pieces.length ? { pieces: dims.pieces } : {}),
  }

  return {
    slug: productSlug[p.slug],
    title,
    product_type: type,
    range: p.variant_group ? rangeOf[p.variant_group] : null,
    primary_category: primary,
    categories: [...cats].sort(),
    axis1_value: sizeLabel || null,
    axis2_value: (p.subgroup_label ?? '').trim() || null,
    base_price: Number(p.base_price),
    origin: ['uk', 'imported'].includes(p.origin) ? p.origin : 'unspecified',
    made_to_order: p.custom_made === true,
    is_featured: p.is_featured === true,
    is_active: p.is_active !== false,
    width_cm: dims.width_cm,
    depth_cm: dims.depth_cm,
    height_cm: dims.height_cm,
    side_a_cm: dims.side_a_cm,
    side_b_cm: dims.side_b_cm,
    specifications,
    gallery_images: (p.gallery_images ?? []).map(image).filter(Boolean),
    sort: sizeRank(sizeLabel || title) * 10 + (p.subgroup_label === 'Scattered Back' ? 1 : 0),
    offer_tier: tierOf[p.slug] ?? null,
  }
})

const payloadVariants = variants.map((v) => {
  const colour = cleanColour(v.color, v.color_hex, VARIANT_OVERRIDES[v.sku])
  if (!colour.name) warnings.push(`colourway ${v.sku} has no colour name`)
  return {
    product: productSlug[v.product],
    sku: v.sku,
    colour_name: colour.name,
    colour_hex: colour.hex,
    material_label: (v.material ?? '').replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, (c) => c.toUpperCase()) || null,
    price_adjustment: Number(v.price_adjustment ?? 0),
    image_url: image(v.image),
    sort: Number(v.priority ?? 99),
    is_active: true,
  }
})

const payload = {
  version: 1,
  product_types: PRODUCT_TYPES,
  categories: payloadCategories,
  ranges: payloadRanges,
  material_collections: payloadCollections,
  materials: payloadMaterials,
  products: payloadProducts,
  variants: payloadVariants,
}
writeFileSync(new URL('catalogue.json', OUT), JSON.stringify(payload))

// ---------------------------------------------------------------------------
// Review and checksums

const f1 = (n) => (n === null || n === undefined ? '' : Number(n).toFixed(1))
console.log('\nDimensions (check by eye): slug | W x D x H | arms | pieces')
for (const p of payloadProducts) {
  const pieces = (p.specifications.pieces ?? []).map((x) => `${x.label} ${f1(x.width_cm)}x${f1(x.depth_cm)}x${f1(x.height_cm)}`).join('; ')
  console.log(
    `${p.slug.padEnd(52)} ${f1(p.width_cm)} x ${f1(p.depth_cm)} x ${f1(p.height_cm)} | ${f1(p.side_a_cm)}/${f1(p.side_b_cm)} | ${p.specifications.shape}${p.specifications.seats ? ` ${p.specifications.seats}` : ''} | ${pieces}`,
  )
}

const md5 = (s) => createHash('md5').update(s).digest('hex')
const productLines = payloadProducts
  .map((p) => [p.slug, p.title, p.base_price.toFixed(2), f1(p.width_cm), f1(p.depth_cm), f1(p.height_cm), f1(p.side_a_cm), f1(p.side_b_cm)].join('|'))
  .sort()
const variantLines = payloadVariants.map((v) => [v.sku, v.product, v.colour_name ?? '', v.price_adjustment.toFixed(2)].join('|')).sort()
const materialLines = payloadMaterials.map((m) => [m.collection, m.code, m.name, m.hex ?? ''].join('|')).sort()

console.log(`\nCounts: ${payloadProducts.length} products, ${payloadVariants.length} variants, ${payloadMaterials.length} materials, ` +
  `${payloadRanges.length} ranges, ${payloadCategories.length} categories, ${manifest.size} images (${Object.keys(imageMap).length} copied)`)
console.log(`Checksums: products ${md5(productLines.join(','))}  variants ${md5(variantLines.join(','))}  materials ${md5(materialLines.join(','))}`)
if (warnings.length) {
  const shown = [...new Set(warnings)]
  console.log(`\n${shown.length} warning(s):\n  ${shown.slice(0, 20).join('\n  ')}${shown.length > 20 ? '\n  ...' : ''}`)
}
