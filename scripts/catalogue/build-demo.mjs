// Builds the demo catalogue: invented "Sample" products with placeholder
// photos, so every part of the site (shop, filters, product pages, basket,
// checkout, offers, the Meta feed, the admin) works and can be tested until
// the owner's own products, details and photos arrive. Nothing here comes
// from the sister shop; only Heartwell's own product types and category tree
// (src/lib/catalogue/import-config.ts) are reused.
//
//   node scripts/catalogue/build-demo.mjs
//
// Writes supabase/seed/demo-catalogue.json, the payload for
// public.import_catalogue(). Every SKU starts DEMO- and every name starts
// "Sample", so demo rows are easy to find and remove later.

import { mkdirSync, writeFileSync } from 'node:fs'
import { CATEGORY_TREE, PRODUCT_TYPES } from '../../src/lib/catalogue/import-config.ts'

const PHOTO = 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1791879772/heartwell/placeholders/photo-coming-soon.png'

const collections = [
  { slug: 'sample-velvet', name: 'Sample Velvet', kind: 'fabric', supplier: null, supplier_handle: null, sort: 1, is_active: true },
  { slug: 'sample-chenille', name: 'Sample Chenille', kind: 'fabric', supplier: null, supplier_handle: null, sort: 2, is_active: true },
  { slug: 'sample-leather-look', name: 'Sample Leather-look', kind: 'other', supplier: null, supplier_handle: null, sort: 3, is_active: true },
]

const swatch = (collection, prefix, list) =>
  list.map(([name, hex], i) => ({
    collection,
    code: `${prefix}${String(i + 1).padStart(2, '0')}`,
    name,
    supplier_title: null,
    hex,
    image_url: null,
    sort: i + 1,
    is_active: true,
    is_swatchable: collection !== 'sample-leather-look',
  }))

const materials = [
  ...swatch('sample-velvet', 'SV', [
    ['Grey', '#8A8A8E'],
    ['Navy', '#22304F'],
    ['Emerald', '#1F5C4A'],
    ['Blush', '#D9A9A3'],
    ['Mustard', '#C9962E'],
    ['Charcoal', '#3B3B3F'],
  ]),
  ...swatch('sample-chenille', 'SC', [
    ['Cream', '#E8E0D0'],
    ['Stone', '#B9AE9C'],
    ['Silver', '#A9ABAE'],
    ['Mocha', '#6F5646'],
  ]),
  ...swatch('sample-leather-look', 'SL', [
    ['Black', '#1E1C1C'],
    ['Brown', '#5A3A28'],
    ['Grey', '#6E6E70'],
  ]),
]

const ranges = [
  { slug: 'sample-velvet', name: 'Sample Velvet', axis1_name: 'Size', axis2_name: 'Back style', sort: 1 },
  { slug: 'sample-recliner', name: 'Sample Recliner', axis1_name: 'Size', axis2_name: null, sort: 2 },
  { slug: 'sample-chenille', name: 'Sample Chenille', axis1_name: 'Size', axis2_name: null, sort: 3 },
]

const product = (p) => ({
  range: null,
  axis2_value: null,
  origin: 'uk',
  made_to_order: true,
  is_featured: false,
  is_active: true,
  side_a_cm: null,
  side_b_cm: null,
  gallery_images: [],
  ...p,
})

const products = [
  product({
    slug: 'sample-velvet-3-seater-high-back',
    title: 'Sample Velvet 3 Seater High Back',
    product_type: 'sofa',
    range: 'sample-velvet',
    primary_category: 'fabric-sofas',
    categories: ['fabric-sofas'],
    axis1_value: '3 Seater',
    axis2_value: 'High Back',
    base_price: 549,
    is_featured: true,
    width_cm: 205,
    depth_cm: 95,
    height_cm: 92,
    specifications: { shape: 'straight', seats: 3, material: 'Velvet', feet: 'Black wood', cushions_included: true },
    sort: 100,
    offer_tier: 'STANDARD',
  }),
  product({
    slug: 'sample-velvet-3-seater-scatter-back',
    title: 'Sample Velvet 3 Seater Scatter Back',
    product_type: 'sofa',
    range: 'sample-velvet',
    primary_category: 'fabric-sofas',
    categories: ['fabric-sofas'],
    axis1_value: '3 Seater',
    axis2_value: 'Scatter Back',
    base_price: 569,
    width_cm: 205,
    depth_cm: 95,
    height_cm: 88,
    specifications: { shape: 'straight', seats: 3, material: 'Velvet', feet: 'Black wood', cushions_included: true },
    sort: 110,
    offer_tier: 'STANDARD',
  }),
  product({
    slug: 'sample-velvet-3-2-set-high-back',
    title: 'Sample Velvet 3+2 Set High Back',
    product_type: 'sofa',
    range: 'sample-velvet',
    primary_category: '3-2-sofa-sets',
    categories: ['3-2-sofa-sets', 'fabric-sofas'],
    axis1_value: '3+2 Set',
    axis2_value: 'High Back',
    base_price: 899,
    width_cm: 205,
    depth_cm: 95,
    height_cm: 92,
    dimensions_note: 'The 2 seater is 165 cm wide.',
    specifications: { shape: 'set', seats: 5, material: 'Velvet', feet: 'Black wood', cushions_included: true, pieces: [{ name: '3 seater', width_cm: 205 }, { name: '2 seater', width_cm: 165 }] },
    sort: 200,
    offer_tier: 'MID',
  }),
  product({
    slug: 'sample-velvet-corner-high-back',
    title: 'Sample Velvet Corner Sofa High Back',
    product_type: 'sofa',
    range: 'sample-velvet',
    primary_category: 'corner-sofas',
    categories: ['corner-sofas', 'fabric-sofas'],
    axis1_value: 'Corner',
    axis2_value: 'High Back',
    base_price: 799,
    is_featured: true,
    width_cm: 240,
    depth_cm: 95,
    height_cm: 92,
    side_a_cm: 240,
    side_b_cm: 200,
    specifications: { shape: 'corner', seats: 5, material: 'Velvet', feet: 'Black wood', cushions_included: true },
    sort: 300,
    offer_tier: 'MID',
  }),
  product({
    slug: 'sample-velvet-u-shape-high-back',
    title: 'Sample Velvet U-Shape High Back',
    product_type: 'sofa',
    range: 'sample-velvet',
    primary_category: 'u-shaped-sofas',
    categories: ['u-shaped-sofas', 'corner-sofas', 'fabric-sofas'],
    axis1_value: 'U-Shape',
    axis2_value: 'High Back',
    base_price: 1099,
    width_cm: 300,
    depth_cm: 95,
    height_cm: 92,
    side_a_cm: 180,
    side_b_cm: 180,
    specifications: { shape: 'u-shape', seats: 7, material: 'Velvet', feet: 'Black wood', cushions_included: true },
    sort: 400,
    offer_tier: 'HIGH',
  }),
  product({
    slug: 'sample-recliner-3-seater-electric',
    title: 'Sample Recliner 3 Seater Electric',
    product_type: 'sofa',
    range: 'sample-recliner',
    primary_category: 'electric-recliners',
    categories: ['electric-recliners', 'recliners', 'leather-sofas'],
    axis1_value: '3 Seater',
    base_price: 949,
    origin: 'imported',
    made_to_order: false,
    width_cm: 200,
    depth_cm: 98,
    height_cm: 100,
    specifications: { shape: 'straight', seats: 3, material: 'Leather-look', reclining: 'Electric' },
    sort: 500,
    offer_tier: 'HIGH',
  }),
  product({
    slug: 'sample-recliner-armchair',
    title: 'Sample Recliner Armchair',
    product_type: 'armchair',
    range: 'sample-recliner',
    primary_category: 'armchairs-and-footstools',
    categories: ['armchairs-and-footstools', 'recliners', 'leather-sofas'],
    axis1_value: 'Armchair',
    base_price: 349,
    origin: 'imported',
    made_to_order: false,
    width_cm: 95,
    depth_cm: 98,
    height_cm: 100,
    specifications: { shape: 'armchair', seats: 1, material: 'Leather-look', reclining: 'Manual' },
    sort: 510,
    offer_tier: 'STANDARD',
  }),
  product({
    slug: 'sample-chenille-2-seater',
    title: 'Sample Chenille 2 Seater',
    product_type: 'sofa',
    range: 'sample-chenille',
    primary_category: 'fabric-sofas',
    categories: ['fabric-sofas'],
    axis1_value: '2 Seater',
    base_price: 449,
    width_cm: 165,
    depth_cm: 92,
    height_cm: 88,
    specifications: { shape: 'straight', seats: 2, material: 'Chenille', feet: 'Oak', cushions_included: true },
    sort: 600,
    offer_tier: 'STANDARD',
  }),
  product({
    slug: 'sample-chenille-footstool',
    title: 'Sample Chenille Footstool',
    product_type: 'footstool',
    range: 'sample-chenille',
    primary_category: 'armchairs-and-footstools',
    categories: ['armchairs-and-footstools', 'fabric-sofas'],
    axis1_value: 'Footstool',
    base_price: 149,
    width_cm: 80,
    depth_cm: 60,
    height_cm: 42,
    specifications: { material: 'Chenille', feet: 'Oak' },
    sort: 610,
    offer_tier: 'EXCLUDED',
  }),
]

// Colourways: each product's own colours (the made-to-order ones can also be
// had in any fabric from the library on the product page).
const colours = {
  velvet: [['Grey', '#8A8A8E', 'GRY'], ['Navy', '#22304F', 'NVY'], ['Emerald', '#1F5C4A', 'EMR']],
  leather: [['Black', '#1E1C1C', 'BLK'], ['Brown', '#5A3A28', 'BRN']],
  chenille: [['Cream', '#E8E0D0', 'CRM'], ['Stone', '#B9AE9C', 'STN']],
}
const code = (slug) =>
  slug
    .replace(/^sample-/, '')
    .split('-')
    .map((w) => (/^\d/.test(w) ? w : w[0]))
    .join('')
    .toUpperCase()

const variants = products.flatMap((p) => {
  const family = p.range === 'sample-recliner' ? 'leather' : p.range === 'sample-chenille' ? 'chenille' : 'velvet'
  const label = family === 'leather' ? 'Leather-look' : family === 'chenille' ? 'Chenille' : 'Velvet'
  return colours[family].map(([name, hex, short], i) => ({
    product: p.slug,
    sku: `DEMO-${code(p.slug)}-${short}`,
    colour_name: name,
    colour_hex: hex,
    material_label: label,
    // One colour costs a little more, so price differences can be tested.
    price_adjustment: i === 2 ? 20 : 0,
    image_url: PHOTO,
    sort: i + 1,
    is_active: true,
  }))
})

const payload = {
  version: 1,
  product_types: PRODUCT_TYPES,
  categories: CATEGORY_TREE.map((c) => ({ slug: c.slug, name: c.name, parent_slug: c.parent, image_url: null, sort: c.sort })),
  ranges,
  material_collections: collections,
  materials,
  products,
  variants,
}

const out = new URL('../../supabase/seed/', import.meta.url)
mkdirSync(out, { recursive: true })
writeFileSync(new URL('demo-catalogue.json', out), `${JSON.stringify(payload, null, 2)}\n`)
const skus = new Set(variants.map((v) => v.sku))
if (skus.size !== variants.length) throw new Error('Duplicate demo SKUs')
console.log(`Demo catalogue: ${products.length} products, ${variants.length} colourways, ${materials.length} fabrics, ${ranges.length} ranges`)
