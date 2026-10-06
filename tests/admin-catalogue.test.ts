import { describe, expect, it } from 'vitest'
import {
  checkDraft,
  copyDraft,
  draftFromRow,
  emptyDraft,
  explainCatalogueError,
  savedNote,
  savePayload,
  slugify,
  specsPayload,
  type ProductDraft,
  type ProductRow,
  type SpecFieldDef,
} from '@/lib/admin/catalogue-form'
import {
  categoryTree,
  checkCollection,
  checkType,
  descendantsOf,
  emptyCollectionDraft,
  emptyTypeDraft,
  explainStructureError,
  filtersWithoutFields,
  materialRows,
  readSpecFields,
  typeRow,
} from '@/lib/admin/structure-form'
import { checkSettings, cleanOfferCode, settingsDraft } from '@/lib/admin/settings-form'
import { cloudinarySignature } from '@/lib/admin/cloudinary-sign'

const SOFA_FIELDS: SpecFieldDef[] = [
  { key: 'shape', label: 'Shape', kind: 'text' },
  { key: 'seats', label: 'Seats', kind: 'number' },
  { key: 'usb_ports', label: 'USB ports', kind: 'boolean' },
  { key: 'pieces', label: 'Pieces', kind: 'pieces' },
]

const TABLE_FIELDS: SpecFieldDef[] = [
  { key: 'top', label: 'Top', kind: 'text', options: ['Oak', 'Glass'] },
  { key: 'shelves', label: 'Shelves', kind: 'number' },
]

function coffeeTable(): ProductDraft {
  const d = emptyDraft('coffee-table')
  return {
    ...d,
    title: 'Test Coffee Table',
    slug: slugify('Test Coffee Table'),
    basePrice: '199',
    primaryCategory: 'living-room',
    categories: ['tables', 'living-room'],
    dims: { ...d.dims, width_cm: '110', depth_cm: '60', height_cm: '45' },
    specs: { top: 'Oak', shelves: '1' },
    highlights: '- Solid oak\n\n• Easy to assemble\n',
    gallery: ['https://res.cloudinary.com/iv3tp2iq/image/upload/v1/heartwell/uploads/a.jpg'],
    variants: [{ ...d.variants[0]!, sku: 'TEST-CT-OAK', colourName: 'Oak', colourHex: '#AA8855' }],
  }
}

describe('product drafts', () => {
  it('makes web addresses from names', () => {
    expect(slugify('Oak & Glass Coffee Table')).toBe('oak-and-glass-coffee-table')
    expect(slugify('  Café 3+2 Set!  ')).toBe('cafe-3-plus-2-set')
    expect(slugify('---')).toBe('')
  })

  it('accepts a complete coffee table', () => {
    expect(checkDraft(coffeeTable(), TABLE_FIELDS)).toEqual([])
  })

  it('explains what stops a save', () => {
    const d = coffeeTable()
    const bad: ProductDraft = {
      ...d,
      title: ' ',
      slug: 'Bad Slug',
      basePrice: '£199',
      range: 'ashton',
      axis1: '',
      dims: { ...d.dims, width_cm: '0' },
      specs: { shelves: 'two' },
      gallery: ['https://example.com/x.jpg'],
      variants: [
        { ...d.variants[0]!, sku: 'A-1', colourHex: 'red' },
        { ...d.variants[0]!, key: 'b', sku: 'a-1', priceAdjustment: 'ten' },
      ],
    }
    const fields = checkDraft(bad, TABLE_FIELDS).map((p) => p.field)
    expect(fields).toEqual(
      expect.arrayContaining(['title', 'slug', 'basePrice', 'axis1', 'dims.width_cm', 'specs.shelves', 'gallery', 'variants.0.colourHex', 'variants.1.sku', 'variants.1.priceAdjustment']),
    )
  })

  it('needs a colourway, and one of them shown', () => {
    expect(checkDraft({ ...coffeeTable(), variants: [] }, TABLE_FIELDS).map((p) => p.field)).toContain('variants')
    const hidden = coffeeTable()
    hidden.variants = hidden.variants.map((v) => ({ ...v, isActive: false }))
    expect(checkDraft(hidden, TABLE_FIELDS).map((p) => p.message).join(' ')).toMatch(/at least one colourway shown/)
  })

  it('builds the database payload', () => {
    const p = savePayload(coffeeTable(), TABLE_FIELDS)
    expect(p.categories).toEqual(['living-room', 'tables'])
    expect(p.axis1_value).toBe('')
    expect(p.highlights).toEqual(['Solid oak', 'Easy to assemble'])
    expect(p.specifications).toEqual({ top: 'Oak', shelves: 1 })
    expect(p.variants[0]).toMatchObject({ id: null, sku: 'TEST-CT-OAK', sort: '1', price_adjustment: '0' })
    expect(p.width_cm).toBe('110')
    expect(p.seat_height_cm).toBe('')
  })

  it('keeps stored details the type no longer lists, and drops emptied ones', () => {
    const out = specsPayload(
      SOFA_FIELDS,
      { specs: { shape: 'corner', seats: '', usb_ports: false }, pieces: [{ label: '3 Seater', width: '198', depth: '', height: '97' }, { label: ' ', width: '1', depth: '', height: '' }] },
      { shape: 'straight', seats: 3, usb_ports: true, legacy_note: 'kept' },
    )
    expect(out).toEqual({ shape: 'corner', legacy_note: 'kept', pieces: [{ label: '3 Seater', width_cm: 198, depth_cm: null, height_cm: 97 }] })
  })

  it('round-trips a stored sofa without changing it', () => {
    const row: ProductRow = {
      id: '2d8293ef-5fe9-4836-89e3-dda6274b80ad',
      slug: 'ashton-3-seater',
      title: 'Ashton 3 Seater',
      trade_title: null,
      type: { slug: 'sofa' },
      range: { slug: 'ashton' },
      primary: { slug: 'fabric-sofas' },
      axis1_value: '3 Seater',
      axis2_value: 'High back',
      base_price: 749,
      origin: 'uk',
      made_to_order: true,
      is_featured: false,
      is_active: true,
      sort: 3,
      width_cm: 198,
      depth_cm: 94,
      height_cm: 97,
      seat_height_cm: null,
      seat_depth_cm: null,
      side_a_cm: null,
      side_b_cm: null,
      dimensions_note: null,
      specifications: { shape: 'straight', seats: 3, usb_ports: true, pieces: [{ label: 'Sofa', width_cm: 198, depth_cm: 94, height_cm: 97 }] },
      description: 'Deep seats.\n\nFirm back.',
      highlights: ['Made in the UK'],
      seo_title: null,
      seo_description: null,
      gallery_images: [],
      categories: ['fabric-sofas', 'sofas'],
      tier: 'MID',
      variants: [
        { id: 'b5f3c2a1-0000-4000-8000-000000000002', sku: 'AHB3-B', colour_name: 'Blue', colour_hex: '#223355', material_label: null, price_adjustment: 20, image_url: null, sort: 2, is_active: true },
        { id: 'b5f3c2a1-0000-4000-8000-000000000001', sku: 'AHB3-G', colour_name: 'Grey', colour_hex: '#8A8D8F', material_label: null, price_adjustment: 0, image_url: null, sort: 1, is_active: true },
      ],
    }
    const draft = draftFromRow(row, SOFA_FIELDS)
    expect(draft.categories).toEqual(['sofas'])
    expect(draft.variants.map((v) => v.sku)).toEqual(['AHB3-G', 'AHB3-B'])
    expect(checkDraft(draft, SOFA_FIELDS)).toEqual([])
    const p = savePayload(draft, SOFA_FIELDS, row.specifications as Record<string, unknown>)
    expect(p.specifications).toEqual(row.specifications)
    expect(p.categories).toEqual(['fabric-sofas', 'sofas'])
    expect(p).toMatchObject({ base_price: '749', offer_tier: 'MID', origin: 'uk', made_to_order: true, axis1_value: '3 Seater', width_cm: '198', depth_cm: '94' })
    expect(p.variants.map((v) => [v.sku, v.sort, v.price_adjustment])).toEqual([
      ['AHB3-G', '1', '0'],
      ['AHB3-B', '2', '20'],
    ])
  })

  it('copies a product without its ids or SKUs, hidden', () => {
    const copy = copyDraft({ ...coffeeTable(), id: '2d8293ef-5fe9-4836-89e3-dda6274b80ad' })
    expect(copy).toMatchObject({ id: null, slug: 'test-coffee-table-copy', isActive: false })
    expect(copy.variants.every((v) => v.id === null && v.sku === '')).toBe(true)
  })

  it('puts database refusals into words', () => {
    expect(explainCatalogueError('SLUG_TAKEN')).toMatch(/already uses that web address/)
    expect(explainCatalogueError('HAS_ORDERS')).toMatch(/Hide it instead/)
    expect(explainCatalogueError('INVALID_VALUE: product_variants_colour_hex_check')).toMatch(/#8A8D8F/)
    expect(explainCatalogueError('INVALID_VALUE: something_new')).toMatch(/something_new/)
    expect(savedNote(0, 0)).toBe('Saved. The shop shows it on the next visit.')
    expect(savedNote(2, 1)).toMatch(/2 colourways deleted\. 1 ordered colourway hidden/)
  })
})

describe('catalogue structure', () => {
  it('reads stored spec fields, ignoring anything malformed', () => {
    expect(readSpecFields([{ key: 'top', label: 'Top', kind: 'text', options: ['Oak', 3, ''] }, { key: 'x' }, 'nope', { key: 'n', label: 'N', kind: 'odd' }])).toEqual([
      { key: 'top', label: 'Top', kind: 'text', options: ['Oak'] },
      { key: 'n', label: 'N', kind: 'text' },
    ])
    expect(readSpecFields(null)).toEqual([])
  })

  it('checks a new product type and stores it tidily', () => {
    const d = { ...emptyTypeDraft(), slug: 'coffee-table', name: 'Coffee table', namePlural: 'Coffee tables', filters: ['colour', 'price', 'shape'] }
    expect(checkType(d)).toEqual([])
    expect(filtersWithoutFields(d)).toEqual(['shape'])
    const row = typeRow({ ...d, specFields: [{ rowKey: 'a', key: 'top', label: ' Top ', kind: 'text', options: 'Oak, Glass ,' }], materialKinds: ['wood', 'fabric'] })
    expect(row.filters).toEqual(['shape', 'price', 'colour'])
    expect(row.material_kinds).toEqual(['fabric', 'wood'])
    expect(row.spec_fields).toEqual([{ key: 'top', label: 'Top', kind: 'text', options: ['Oak', 'Glass'] }])
    expect(row.google_product_category).toBeNull()
  })

  it('refuses duplicate or badly named fields', () => {
    const d = emptyTypeDraft()
    const problems = checkType({
      ...d,
      slug: 'Coffee Table',
      specFields: [
        { rowKey: 'a', key: 'top', label: 'Top', kind: 'text', options: '' },
        { rowKey: 'b', key: 'top', label: '', kind: 'text', options: '' },
        { rowKey: 'c', key: '1st', label: 'First', kind: 'pieces', options: '' },
        { rowKey: 'd', key: 'more', label: 'More', kind: 'pieces', options: '' },
      ],
    })
    expect(problems.join(' ')).toMatch(/short name/)
    expect(problems.join(' ')).toMatch(/used twice/)
    expect(problems.join(' ')).toMatch(/label customers will read/)
    expect(problems.join(' ')).toMatch(/starting with a letter/)
    expect(problems.join(' ')).toMatch(/one Pieces field/)
  })

  it('orders the category tree and finds what can’t be a new parent', () => {
    const rows = [
      { id: 'c', parent_id: 'a', sort: 2, name: 'Corner' },
      { id: 'a', parent_id: null, sort: 1, name: 'Sofas' },
      { id: 'e', parent_id: 'r', sort: 1, name: 'Electric' },
      { id: 'r', parent_id: 'a', sort: 1, name: 'Recliners' },
      { id: 't', parent_id: null, sort: 2, name: 'Tables' },
    ]
    expect(categoryTree(rows).map((r) => `${r.depth}${r.id}`)).toEqual(['0a', '1r', '2e', '1c', '0t'])
    expect([...descendantsOf(rows, 'a')].sort()).toEqual(['a', 'c', 'e', 'r'])
    expect([...descendantsOf(rows, 't')]).toEqual(['t'])
  })

  it('checks a material collection and numbers its colours in order', () => {
    const d = { ...emptyCollectionDraft(), slug: 'oak', name: 'Oak', kind: 'wood' as const }
    d.materials = [
      { rowKey: '1', id: null, code: 'OAK1', name: 'Light oak', hex: '#c8a165', imageUrl: '', isActive: true, isSwatchable: true },
      { rowKey: '2', id: 'b5f3c2a1-0000-4000-8000-000000000009', code: 'oak1', name: 'Dark oak', hex: 'brown', imageUrl: '', isActive: true, isSwatchable: false },
    ]
    const problems = checkCollection(d).join(' ')
    expect(problems).toMatch(/used twice/)
    expect(problems).toMatch(/#8A8D8F/)
    const rows = materialRows(d, 'col-1')
    expect(rows[0]).toMatchObject({ collection_id: 'col-1', code: 'OAK1', hex: '#C8A165', sort: 1 })
    expect(rows[0]).not.toHaveProperty('id')
    expect(rows[1]).toMatchObject({ id: 'b5f3c2a1-0000-4000-8000-000000000009', sort: 2 })
  })

  it('puts Postgres refusals into words', () => {
    expect(explainStructureError('update or delete on table "product_types" violates foreign key constraint "products_product_type_id_fkey"', '23503')).toMatch(/Move them to another type/)
    expect(explainStructureError('CATEGORY_CYCLE: x cannot sit under its own descendant', '23514')).toMatch(/own subcategories/)
    expect(explainStructureError('duplicate key value violates unique constraint "categories_slug_key"', '23505')).toMatch(/already used/)
  })
})

describe('shop settings', () => {
  const current = {
    upstairs_first_floor: 20,
    upstairs_per_extra_floor: 10,
    max_floor: 20,
    assembly_fee: 20,
    removal_per_seat: 10,
    removal_min_seats: 1,
    removal_default_seats: 3,
    removal_max_seats: 10,
    delivery_min_working_days: 2,
    delivery_max_working_days: 4,
    preferred_date_min_days: 4,
    preferred_date_max_days: 180,
    offer_tier_high: 50,
    offer_tier_mid: 30,
    offer_tier_standard: 20,
    paid_offer_days: 7,
    sample_limit: 5,
  }

  it('accepts the current settings', () => {
    const { problems, row } = checkSettings(settingsDraft(current))
    expect(problems).toEqual([])
    expect(row).toEqual(current)
  })

  it('catches impossible windows and bad numbers', () => {
    const d = settingsDraft({ ...current, delivery_min_working_days: 6, removal_default_seats: 12 })
    expect(checkSettings(d).problems.join(' ')).toMatch(/can’t end before it starts/)
    expect(checkSettings({ ...settingsDraft(current), assembly_fee: '£20' }).problems[0]).toMatch(/amount in pounds/)
    expect(checkSettings({ ...settingsDraft(current), max_floor: '51' }).problems[0]).toMatch(/between 1 and 50/)
    expect(checkSettings({ ...settingsDraft(current), offer_tier_mid: '60' }).problems[0]).toMatch(/high should be at least mid/)
  })

  it('tidies offer codes', () => {
    expect(cleanOfferCode(' welcome 50 ')).toBe('WELCOME50')
    expect(cleanOfferCode('abc')).toBeNull()
    expect(cleanOfferCode('TEN-OFF')).toBeNull()
  })
})

describe('Cloudinary upload signature', () => {
  it('matches Cloudinary’s documented example', () => {
    expect(cloudinarySignature({ public_id: 'sample_image', timestamp: 1315060510, eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' }, 'abcd')).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
  })

  it('never signs the file, key or cloud name', () => {
    const base = { timestamp: 1, folder: 'heartwell/uploads' }
    expect(cloudinarySignature({ ...base, api_key: '123', file: 'x', cloud_name: 'c', resource_type: 'image' }, 's')).toBe(cloudinarySignature(base, 's'))
  })
})
