// Builds Heartwell's catalogue (Phase 17A): the products the shop sells, with
// the owner's own photos (in Heartwell's Cloudinary) and Heartwell's own words.
//
//   node scripts/catalogue/build-import.mjs     (once: sizes, prices, colours, SKUs)
//   node scripts/catalogue/build-catalogue.mjs  (this file)
//
// Reads, all local and git-ignored:
//   reference/.import/catalogue.json   cleaned products from build-import.mjs
//   reference/catalogue/*.jsonl        only to find each colourway's photo by file name
//   reference/.import/owner-photos.txt the owner's photos: folder|public id|version|format
// Writes into reference/.import/:
//   heartwell-catalogue.json  the payload for public.import_catalogue()
//   heartwell-copy.json       descriptions and highlights by product slug
// and prints what has no photo, what's hidden and why.
//
// Owner's decisions (14-15 October 2026): the old "Lily" range is Sims; the
// beige bolster sofas are Lily; Bishop isn't sold; new pieces stay hidden
// until the owner sends their prices and sizes.

import { readFileSync, writeFileSync } from 'node:fs'
import { describeProduct } from './catalogue-copy.mjs'

const ROOT = new URL('../../', import.meta.url)
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8')
const load = (name) => {
  const [header, ...rows] = read(`reference/catalogue/${name}`).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
  return rows.map((r) => Object.fromEntries(header.map((k, i) => [k, r[i]])))
}

const base = JSON.parse(read('reference/.import/catalogue.json'))
const refVariants = load('product_variants.jsonl')
const problems = []

// ---------------------------------------------------------------------------
// The owner's photos, found by file name.

const CLOUD = 'https://res.cloudinary.com/iv3tp2iq/image/upload'
const photos = new Map(
  read('reference/.import/owner-photos.txt')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [, id, version, format] = line.split('|')
      return [key(id), `${CLOUD}/v${version}/${id}.${format}`]
    }),
)
function key(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '')
}
function photo(name) {
  const url = photos.get(key(name))
  if (!url) problems.push(`no photo called ${name}`)
  return url ?? null
}
const stem = (path) => (path ?? '').split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/_[a-z0-9]{6}$/i, '')

// Colourways whose reference photo has a different name in the owner's set.
const PHOTO_FOR_SKU = {
  'SAL2-MK': 'Salone-2-Seater-Sofa-Mink',
  'SAL3-MK': 'Salone-3-Seater-Sofa-Mink',
  'RCSB5C-SG': 'Rio-Chesterfield-5-Seater-Corner-High-Back-Sofa',
  'VHB4C12-G': 'Verona-5-seater-1c2-corner-high-back-sofa-grey',
}
const refPhotoBySku = Object.fromEntries(refVariants.map((v) => [v.sku, stem(v.image)]))

// Extra photos, only on the product they show.
const GALLERIES = {
  'verona-scattered-back-5-seater-corner': [
    'Verona-5-Seater-Corner-Scatterback-Gallery-Image-1',
    'Verona-5-Seater-Corner-Scatterback-Gallery-Image-2',
    'Verona-5-Seater-Corner-Scatterback-Gallery-Image-3',
  ],
  'verona-high-back-4-seater-corner-2c1': ['Verona-4-seater-2c1-corner-high-back-sofa-grey2'],
  'hannah-electric-corner': ['Hannah-Electric-Corner-Sofa-Grey-1'],
  'salone-3-2-seater': ['Salone-3-2-Seater-Sofa-Mink-Gallery-Image1'],
  'michigan-electric-recliner-2-seater': ['Michigan-Electric-Recliner-2-Seater-Black-Leather-Gallery1'],
  'michigan-electric-recliner-3-seater': ['Michigan-Electric-Recliner-3-Seater-Black-Leather-Gallery1'],
  'michigan-electric-recliner-corner': ['Michigan-Electric-Recliner-5-Seater-Corner-Grey-Leather-Gallery1'],
  'verona-corner-set': ['Verona-5-seater-corner-cuddle-chair-and-footstool-set-2'],
}

// ---------------------------------------------------------------------------
// Products: the existing range, renamed where the owner said so.

const DROP = new Set(['bishop-u-shaped-scattered-back-sofa'])
const rename = (slug) =>
  slug
    .replace(/^lily-footstool$/, 'sims-footstool')
    .replace(/^lily-/, 'sims-')
    .replace(/^rio-chesterfield-scattered-back-5-seater-corner-2c2$/, 'rio-chesterfield-5-seater-corner')
    .replace(/-5-seater-corner-2c2$/, '-5-seater-corner')
const slugs = {}
const products = base.products
  .filter((p) => !DROP.has(p.slug))
  .map((p) => {
    const slug = rename(p.slug)
    slugs[p.slug] = slug
    const out = { ...p, slug, title: p.title.replace(/^Lily /, 'Sims ').replace(/ 2c2\b/, ''), gallery_images: [] }
    if (p.range === 'lily') out.range = 'sims'
    if (p.range === 'rio-chesterfield') {
      // One Rio style only, so no back-style choice.
      out.axis2_value = null
      out.title = 'Rio Chesterfield 5 Seater Corner'
    }
    return out
  })

const ranges = base.ranges
  .map((r) => (r.slug === 'lily' ? { ...r, slug: 'sims', name: 'Sims' } : r))
  .map((r) => (r.slug === 'rio-chesterfield' ? { ...r, axis2_name: null } : r))

const variants = base.variants
  .filter((v) => slugs[v.product])
  .map((v) => ({ ...v, product: slugs[v.product], image_url: photo(PHOTO_FOR_SKU[v.sku] ?? refPhotoBySku[v.sku]) }))

// The owner's new Silver colour for the Sims 5 seater corner (high back).
variants.push({
  product: 'sims-high-back-5-seater-corner',
  sku: 'LHB5C-SV',
  colour_name: 'Silver',
  colour_hex: '#B9BBBE',
  material_label: 'Fabric',
  price_adjustment: 0,
  image_url: photo('Lily-5-Seater-Corner-High-Back-Sofa-Silver'),
  sort: 5,
  is_active: true,
})

// ---------------------------------------------------------------------------
// New pieces: hidden until the owner sends prices and sizes.

ranges.push(
  { slug: 'lily', name: 'Lily', axis1_name: 'Size', axis2_name: null, sort: ranges.length + 1 },
  { slug: 'michigan-electric-recliner', name: 'Michigan Electric Recliner', axis1_name: 'Size', axis2_name: null, sort: ranges.length + 2 },
)

const hidden = (p) => ({
  axis2_value: null,
  origin: 'unspecified',
  made_to_order: false,
  is_featured: false,
  is_active: false,
  base_price: 0,
  width_cm: null,
  depth_cm: null,
  height_cm: null,
  side_a_cm: null,
  side_b_cm: null,
  gallery_images: [],
  ...p,
})
const sofaCats = (...extra) => [...new Set(['fabric-sofas', ...extra])].sort()
// The new Rio sizes share the corner's materials, arms, feet and cushions.
const rioShared = Object.fromEntries(
  Object.entries(products.find((p) => p.slug === 'rio-chesterfield-5-seater-corner').specifications).filter(([k]) => !['pieces', 'shape', 'seats'].includes(k)),
)

const newProducts = [
  ...[
    ['lily-2-seater', '2 Seater', 2, 'Lily-2-seater-high-back-sofa-1', 'LL2-BG', 20, ['fabric-sofas']],
    ['lily-3-seater', '3 Seater', 3, 'Lily-3-seater-high-back-sofa-1', 'LL3-BG', 30, ['fabric-sofas']],
    ['lily-3-2-seater', '3+2 Seater', 5, 'Lily-3-and-2-seater-high-back-sofa-1', 'LL32-BG', 35, sofaCats('3-2-sofa-sets')],
    ['lily-5-seater-corner', '5 Seater Corner', 5, 'Lily-5-seater-corner-high-back-sofa-1', 'LL5C-BG', 65, sofaCats('corner-sofas')],
  ].map(([slug, size, seats, img, sku, sort, cats]) => ({
    product: hidden({
      slug,
      title: `Lily ${size}`,
      product_type: 'sofa',
      range: 'lily',
      primary_category: cats.includes('corner-sofas') ? 'corner-sofas' : cats.includes('3-2-sofa-sets') ? '3-2-sofa-sets' : 'fabric-sofas',
      categories: cats,
      axis1_value: size,
      specifications: { material: 'Fabric', shape: /corner/i.test(size) ? 'corner' : /\+/.test(size) ? 'set' : 'straight', seats, cushions_included: true },
      sort,
      offer_tier: 'STANDARD',
    }),
    variants: [{ sku, colour_name: 'Beige', colour_hex: '#D8CCB8', material_label: 'Fabric', image: img }],
  })),
  ...[
    ['michigan-electric-recliner-2-seater', '2 Seater', 2, '2-Seater', 'MI2', 20, []],
    ['michigan-electric-recliner-3-seater', '3 Seater', 3, '3-Seater', 'MI3', 30, []],
    ['michigan-electric-recliner-3-2-seater', '3+2 Seater', 5, '3_2-Seater', 'MI32', 35, ['3-2-sofa-sets']],
    ['michigan-electric-recliner-corner', '5 Seater Corner', 5, '5-Seater-Corner', 'MIC', 65, ['corner-sofas']],
  ].map(([slug, size, seats, file, sku, sort, extra]) => ({
    product: hidden({
      slug,
      title: `Michigan Electric Recliner ${size}`,
      product_type: 'sofa',
      range: 'michigan-electric-recliner',
      primary_category: 'electric-recliners',
      categories: [...new Set(['recliners', 'electric-recliners', 'leather-sofas', ...extra])].sort(),
      axis1_value: size,
      origin: 'imported',
      specifications: { material: 'Leather', reclining: 'Electric', led_lights: true, cup_holders: true, shape: /corner/i.test(size) ? 'corner' : /\+/.test(size) ? 'set' : 'straight', seats },
      sort,
      offer_tier: 'HIGH',
    }),
    variants: [
      { sku: `${sku}-BK`, colour_name: 'Black', colour_hex: '#1E1C1C', material_label: 'Leather', image: `Michigan-Electric-Recliner-${file}-Black-Leather` },
      { sku: `${sku}-GR`, colour_name: 'Grey', colour_hex: '#6E6E70', material_label: 'Leather', image: `Michigan-Electric-Recliner-${file}-Grey-Leather` },
    ],
  })),
  ...[
    ['rio-chesterfield-2-seater', '2 Seater', 2, 'Rio-Chesterfield-2-Seater-Corner-High-Back-Sofa', 'RC2-SG', 20, ['fabric-sofas']],
    ['rio-chesterfield-3-seater', '3 Seater', 3, 'Rio-Chesterfield-3-Seater-Corner-High-Back-Sofa', 'RC3-SG', 30, ['fabric-sofas']],
    ['rio-chesterfield-3-2-seater', '3+2 Seater', 5, 'Rio-Chesterfield-3-and-2-Seater-Corner-High-Back-Sofa', 'RC32-SG', 35, sofaCats('3-2-sofa-sets')],
    ['rio-chesterfield-4-seater', '4 Seater', 4, 'Rio-Chesterfield-4-Seater-Corner-High-Back-Sofa', 'RC4-SG', 40, ['fabric-sofas']],
  ].map(([slug, size, seats, img, sku, sort, cats]) => ({
    product: hidden({
      slug,
      title: `Rio Chesterfield ${size}`,
      product_type: 'sofa',
      range: 'rio-chesterfield',
      primary_category: cats.includes('3-2-sofa-sets') ? '3-2-sofa-sets' : 'fabric-sofas',
      categories: cats,
      axis1_value: size,
      origin: 'uk',
      made_to_order: true,
      specifications: { ...rioShared, shape: /\+/.test(size) ? 'set' : 'straight', seats },
      sort,
      offer_tier: 'STANDARD',
    }),
    variants: [{ sku, colour_name: 'Silver Grey', colour_hex: '#B4B2AE', material_label: 'Fabric', image: img }],
  })),
  {
    product: hidden({
      slug: 'verona-cuddle-chair',
      title: 'Verona Cuddle Chair',
      product_type: 'armchair',
      range: null,
      primary_category: 'armchairs-and-footstools',
      categories: ['armchairs-and-footstools', 'fabric-sofas'],
      axis1_value: 'Cuddle Chair',
      origin: 'uk',
      made_to_order: true,
      specifications: { material: 'Fabric', shape: 'armchair', seats: 1 },
      sort: 5,
      offer_tier: 'STANDARD',
    }),
    variants: [{ sku: 'VCC-G', colour_name: 'Grey', colour_hex: '#8A8A8E', material_label: 'Fabric', image: 'Verona-Cuddle-Chair' }],
  },
  {
    product: hidden({
      slug: 'verona-corner-set',
      title: 'Verona 5 Seater Corner, Cuddle Chair and Footstool Set',
      product_type: 'sofa',
      range: null,
      primary_category: 'corner-sofas',
      categories: ['corner-sofas', 'fabric-sofas'],
      axis1_value: 'Corner Set',
      origin: 'uk',
      made_to_order: true,
      specifications: { material: 'Fabric', shape: 'set', seats: 6, cushions_included: true },
      sort: 75,
      offer_tier: 'STANDARD',
    }),
    variants: [{ sku: 'VSET-G', colour_name: 'Grey', colour_hex: '#8A8A8E', material_label: 'Fabric', image: 'Verona-5-seater-corner-cuddle-chair-and-footstool-set' }],
  },
]
for (const n of newProducts) {
  products.push(n.product)
  n.variants.forEach((v, i) => {
    const { image, ...rest } = v
    variants.push({ product: n.product.slug, price_adjustment: 0, sort: i + 1, is_active: true, ...rest, image_url: photo(image) })
  })
}

for (const p of products) p.gallery_images = (GALLERIES[p.slug] ?? []).map(photo).filter(Boolean)

// ---------------------------------------------------------------------------
// Categories, fabrics

const CATEGORY_PHOTO = {
  sofas: '3_2-Seater-Category',
  'corner-sofas': 'Lily-5-Seater-Corner-High-Back-Sofa-Navy-Blue',
  'u-shaped-sofas': 'Lily-U-Shape-Navy-Cream',
  '3-2-sofa-sets': '3_2-Seater',
  'fabric-sofas': 'Fabric-Sofa-Category',
  'leather-sofas': 'Leather-Category',
  recliners: 'Recliner',
  'electric-recliners': 'Electric-Product-Category',
  'armchairs-and-footstools': 'Verona-Cuddle-Chair',
}
const categories = base.categories.map((c) => ({ ...c, image_url: CATEGORY_PHOTO[c.slug] ? photo(CATEGORY_PHOTO[c.slug]) : null }))
const FABRIC_PHOTO = { CH12: 'CH12' }
const materials = base.materials.map((m) => ({ ...m, image_url: FABRIC_PHOTO[m.code] ? photo(FABRIC_PHOTO[m.code]) : null }))

// ---------------------------------------------------------------------------
// Words: one description and highlights per product.

const COPY_KEY = (p) =>
  p.slug === 'sims-footstool'
    ? 'footstool'
    : p.slug.startsWith('orlando')
      ? 'orlando'
      : p.slug.startsWith('oxford')
        ? 'oxford'
        : p.slug === 'verona-cuddle-chair' || p.slug === 'verona-corner-set'
          ? 'verona'
          : p.range
const copy = {}
for (const p of products) {
  const colours = variants.filter((v) => v.product === p.slug).map((v) => v.colour_name)
  const words = describeProduct({ ...p, copyKey: COPY_KEY(p) }, [...new Set(colours)])
  if (!words.description) problems.push(`no words for ${p.slug} (${COPY_KEY(p)})`)
  copy[p.slug] = words
}

// ---------------------------------------------------------------------------

const payload = { ...base, categories, ranges, materials, products, variants }
writeFileSync(new URL('reference/.import/heartwell-catalogue.json', ROOT), JSON.stringify(payload))
writeFileSync(new URL('reference/.import/heartwell-copy.json', ROOT), JSON.stringify(copy))

const shown = products.filter((p) => p.is_active)
const noPhoto = variants.filter((v) => !v.image_url).map((v) => v.sku)
console.log(`Products: ${products.length} (${shown.length} shown, ${products.length - shown.length} hidden until priced)`)
console.log(`Colourways: ${variants.length}; without a photo: ${noPhoto.length ? noPhoto.join(', ') : 'none'}`)
console.log(`Ranges: ${ranges.map((r) => r.name).join(', ')}`)
console.log(`Category photos: ${categories.filter((c) => c.image_url).length}/${categories.length}; fabric photos: ${materials.filter((m) => m.image_url).length}/${materials.length}`)
console.log(`Hidden: ${products.filter((p) => !p.is_active).map((p) => p.slug).join(', ')}`)
if (problems.length) console.log(`\n${problems.length} problem(s):\n  ${[...new Set(problems)].join('\n  ')}`)
