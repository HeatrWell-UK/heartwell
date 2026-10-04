// Heartwell's own catalogue structure: product types, the category tree and
// how the reference catalogue maps onto them. This is Heartwell's, not the
// sister shop's; the import script combines it with the cleaned reference
// rows. No imports, so Node can load it directly.

export const SOFA_SPEC_FIELDS = [
  { key: 'shape', label: 'Shape', kind: 'text' },
  { key: 'seats', label: 'Seats', kind: 'number' },
  { key: 'material', label: 'Material', kind: 'text' },
  { key: 'reclining', label: 'Reclining', kind: 'text' },
  { key: 'arms', label: 'Arms', kind: 'text' },
  { key: 'feet', label: 'Feet', kind: 'text' },
  { key: 'back_cushions', label: 'Back cushions', kind: 'text' },
  { key: 'seat_cushions', label: 'Seat cushions', kind: 'text' },
  { key: 'cushions_included', label: 'All cushions included', kind: 'boolean' },
  { key: 'deep_buttoned_arms', label: 'Deep buttoned arms', kind: 'boolean' },
  { key: 'usb_ports', label: 'USB ports', kind: 'boolean' },
  { key: 'cup_holders', label: 'Cup holders', kind: 'boolean' },
  { key: 'storage', label: 'Storage', kind: 'boolean' },
  { key: 'led_lights', label: 'LED lights', kind: 'boolean' },
  { key: 'pieces', label: 'Pieces', kind: 'pieces' },
]

export const PRODUCT_TYPES = [
  {
    slug: 'sofa',
    name: 'Sofa',
    name_plural: 'Sofas',
    spec_fields: SOFA_SPEC_FIELDS,
    filters: ['shape', 'seats', 'width', 'material', 'colour', 'reclining', 'made_to_order', 'price'],
    material_kinds: ['fabric', 'other'],
    removal_unit: 'seat',
    google_product_category: 'Furniture > Sofas',
    meta_product_category: 'Furniture > Sofas',
    sort: 1,
  },
  {
    slug: 'armchair',
    name: 'Armchair',
    name_plural: 'Armchairs',
    spec_fields: SOFA_SPEC_FIELDS,
    filters: ['material', 'colour', 'reclining', 'made_to_order', 'price'],
    material_kinds: ['fabric', 'other'],
    removal_unit: 'seat',
    google_product_category: 'Furniture > Chairs > Arm Chairs, Recliners & Sleeper Chairs',
    meta_product_category: 'Furniture > Chairs > Arm Chairs, Recliners & Sleeper Chairs',
    sort: 2,
  },
  {
    slug: 'footstool',
    name: 'Footstool',
    name_plural: 'Footstools',
    spec_fields: SOFA_SPEC_FIELDS.filter((f) => ['material', 'feet'].includes(f.key)),
    filters: ['material', 'colour', 'made_to_order', 'price'],
    material_kinds: ['fabric', 'other'],
    removal_unit: 'item',
    google_product_category: 'Furniture > Ottomans',
    meta_product_category: 'Furniture > Ottomans',
    sort: 3,
  },
]

/** The tree. Slugs match the shop menu (src/config/navigation.ts). */
export const CATEGORY_TREE: { slug: string; name: string; parent: string | null; sort: number }[] = [
  { slug: 'sofas', name: 'Sofas', parent: null, sort: 1 },
  { slug: 'corner-sofas', name: 'Corner Sofas', parent: 'sofas', sort: 1 },
  { slug: 'u-shaped-sofas', name: 'U-Shaped Sofas', parent: 'sofas', sort: 2 },
  { slug: '3-2-sofa-sets', name: '3+2 Sofa Sets', parent: 'sofas', sort: 3 },
  { slug: 'fabric-sofas', name: 'Fabric Sofas', parent: 'sofas', sort: 4 },
  { slug: 'leather-sofas', name: 'Leather Sofas', parent: 'sofas', sort: 5 },
  { slug: 'recliners', name: 'Recliners', parent: 'sofas', sort: 6 },
  { slug: 'electric-recliners', name: 'Electric Recliners', parent: 'recliners', sort: 1 },
  { slug: 'armchairs-and-footstools', name: 'Armchairs & Footstools', parent: 'sofas', sort: 7 },
]

/** Reference category slug -> Heartwell category slug. */
export const CATEGORY_MAP: Record<string, string> = {
  'corner-sofa': 'corner-sofas',
  'u-shaped-sofa': 'u-shaped-sofas',
  '3-2-seater': '3-2-sofa-sets',
  'fabric-sofa': 'fabric-sofas',
  'leather-sofa': 'leather-sofas',
  recliner: 'recliners',
  'electric-sofa': 'electric-recliners',
}

/** Material collection kinds. The coated leather-look collection isn't fabric or leather. */
export const COLLECTION_KIND: Record<string, 'fabric' | 'leather' | 'other'> = {
  'pvc-leather': 'other',
}

/** Reference offer tiers -> Heartwell tiers (amounts live in shop_settings). */
export const TIER_MAP: Record<string, 'HIGH' | 'MID' | 'STANDARD' | 'EXCLUDED'> = {
  ELECTRIC: 'HIGH',
  ROMA: 'MID',
  STANDARD: 'STANDARD',
  EXCLUDED: 'EXCLUDED',
}

/** Colourways whose reference name isn't a name. Keyed by SKU (unchanged). */
export const VARIANT_OVERRIDES: Record<string, { name?: string; hex?: string }> = {
  'BU-T': { name: 'Truffle' },
}

/**
 * Display order of sizes within a range: armchair, 2, 3, 3+2, 4 and 5 seaters,
 * corners (by seats), L-shape, U-shape, armed U-shape, footstool. The most
 * specific match wins, so "3+2 Seater" isn't read as a 2 seater.
 */
export function sizeRank(label: string): number {
  const t = label.toLowerCase()
  const seats = Number(/(\d)\s*seater/.exec(t)?.[1] ?? 0)
  if (/foot\s*stool/.test(t)) return 100
  if (/armed\s+u[\s-]?shape/.test(t)) return 90
  if (/u[\s-]?shape/.test(t)) return 80
  if (/l[\s-]shape/.test(t)) return 70
  if (/corner/.test(t)) return 60 + seats
  if (/3\s*\+\s*2|3\s*and\s*2/.test(t)) return 35
  if (/arm\s*chair/.test(t)) return 0
  return seats ? seats * 10 : 99
}
