import { describe, expect, it } from 'vitest'
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
} from '@/lib/catalogue/clean'
import { sizeRank } from '@/lib/catalogue/import-config'
import { catalogueIssues, dimensionSummary } from '@/lib/catalogue/display'

describe('parseDimensions', () => {
  it('reads a single piece in either label style', () => {
    expect(parseDimensions('L:198cm H:97cm D:94cm')).toMatchObject({ width_cm: 198, depth_cm: 94, height_cm: 97, pieces: [] })
    // Where "Length" is given, "Width" is front to back.
    expect(parseDimensions('Length:169 | Width:94 | Height:94')).toMatchObject({ width_cm: 169, depth_cm: 94, height_cm: 94 })
    expect(parseDimensions('192 cm')).toMatchObject({ width_cm: 192, depth_cm: null, height_cm: null })
  })

  it('splits a two-piece set and takes the larger piece as the headline', () => {
    const d = parseDimensions('3-Seater\t\n\tL:200 cm H:90cm D:95cm\n2-seater \n\tL:170cm H:90cm D:95cm')
    expect(d.pieces).toEqual([
      { label: '3 Seater', width_cm: 200, depth_cm: 95, height_cm: 90 },
      { label: '2 Seater', width_cm: 170, depth_cm: 95, height_cm: 90 },
    ])
    expect(d).toMatchObject({ width_cm: 200, depth_cm: 95, height_cm: 90 })
  })

  it('reads corners as two sides and U-shapes with the back in the middle', () => {
    expect(parseDimensions('250cm x 200cm H:88cm D:92cm')).toMatchObject({
      width_cm: 250, side_a_cm: 250, side_b_cm: 200, depth_cm: 92, height_cm: 88,
    })
    expect(parseDimensions('300 x 300')).toMatchObject({ width_cm: 300, side_a_cm: 300, side_b_cm: 300 })
    expect(parseDimensions('L:220cm x 310cm x 170cm H:92cm D:88cm')).toMatchObject({
      width_cm: 310, side_a_cm: 220, side_b_cm: 170, depth_cm: 88, height_cm: 92,
    })
    expect(parseDimensions('200x330x200cm')).toMatchObject({ width_cm: 330, side_a_cm: 200, side_b_cm: 200 })
  })

  it('returns nothing for empty text', () => {
    for (const empty of [null, undefined, '', '   ']) {
      expect(parseDimensions(empty)).toEqual({ width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null, pieces: [] })
    }
  })
})

describe('shapeAndSeats', () => {
  it('reads the shape and seat count from a size label or title', () => {
    expect(shapeAndSeats('2 Seater')).toEqual({ shape: 'straight', seats: 2 })
    expect(shapeAndSeats('3+2 Seater')).toEqual({ shape: 'set', seats: 5 })
    expect(shapeAndSeats('Sample 3 and 2 Sofa')).toEqual({ shape: 'set', seats: 5 })
    expect(shapeAndSeats('4 Seater Corner 1c2')).toEqual({ shape: 'corner', seats: 4 })
    expect(shapeAndSeats('Corner')).toEqual({ shape: 'corner', seats: null })
    expect(shapeAndSeats('L-Shape')).toEqual({ shape: 'corner', seats: null })
    expect(shapeAndSeats('Armed U-Shape')).toEqual({ shape: 'u-shape', seats: null })
    expect(shapeAndSeats('Sample U Shaped Sofa')).toEqual({ shape: 'u-shape', seats: null })
    expect(shapeAndSeats('Arm Chair')).toEqual({ shape: 'armchair', seats: 1 })
    expect(shapeAndSeats('Foot Stool')).toEqual({ shape: 'footstool', seats: null })
  })
})

describe('titles, slugs and names', () => {
  it('tidies titles without renaming designs', () => {
    expect(cleanTitle('  Sample  U shaped Sofa ')).toBe('Sample U-Shaped Sofa')
    expect(cleanTitle('Sample 3 + 2 seater')).toBe('Sample 3+2 Seater')
    expect(cleanTitle('Sample Recliner Arm Chair')).toBe('Sample Recliner Armchair')
  })

  it('makes consistent web addresses', () => {
    expect(cleanSlug('sample-3and2-seater')).toBe('sample-3-2-seater')
    expect(cleanSlug('sample-3-and-2')).toBe('sample-3-2')
    expect(cleanSlug('Sample-Arm-Chair ')).toBe('sample-armchair')
    expect(cleanSlug('sample--sofa_')).toBe('sample-sofa')
    expect(slugify('Armchairs & Footstools')).toBe('armchairs-and-footstools')
    expect(slugify('3+2 Sofa Sets')).toBe('3-2-sofa-sets')
  })

  it('drops the product word from range names', () => {
    expect(rangeName('Sample Sofa')).toBe('Sample')
    expect(rangeName('Sample Electric Recliner')).toBe('Sample Electric Recliner')
  })

  it('orders sizes within a range', () => {
    const labels = ['Footstool', 'Armed U-Shape', 'U-Shape', 'L-Shape', '5 Seater Corner 2c2', '4 Seater Corner 1c2', '3+2 Seater', '3 Seater', '2 Seater', 'Armchair']
    // Start from the reverse order so a stable sort can't pass by doing nothing.
    expect([...labels].sort((a, b) => sizeRank(a) - sizeRank(b))).toEqual([...labels].reverse())
  })
})

describe('colours', () => {
  it('normalises hex values', () => {
    expect(cleanHex('#7d7d7d')).toBe('#7D7D7D')
    expect(cleanHex('7d7d7d')).toBe('#7D7D7D')
    expect(cleanHex('grey')).toBeNull()
    expect(cleanHex(null)).toBeNull()
  })

  it('title-cases names and turns an RGB triplet into the swatch colour', () => {
    expect(cleanColour('navy blue', '#1f2a44')).toEqual({ name: 'Navy Blue', hex: '#1F2A44' })
    expect(cleanColour('10, 20, 255', null)).toEqual({ name: null, hex: '#0A14FF' })
    expect(cleanColour('10, 20, 255', null, { name: 'Ocean' })).toEqual({ name: 'Ocean', hex: '#0A14FF' })
  })
})

describe('cleanSpecifications', () => {
  it('maps loose keys to typed fields and drops the rest', () => {
    expect(
      cleanSpecifications({
        Material: ' Plush  velvet ',
        Feet: 'CHROME LEGS',
        Arms: 'Scroll',
        'Back Cushions': 'Fibre',
        'Seat Cushions': 'Foam',
        'All Cushions Included': '✓',
        'USP Port': '✓',
        'Cup Holders': 'yes',
        'Storage Space': '✗',
        Dimensions: 'L:200cm',
        Style: 'High Back',
        Reclining: 'Electric',
      }),
    ).toEqual({
      material: 'Plush velvet',
      feet: 'Chrome legs',
      arms: 'Scroll',
      back_cushions: 'Fibre',
      seat_cushions: 'Foam',
      cushions_included: true,
      usb_ports: true,
      cup_holders: true,
    })
    expect(cleanSpecifications(null)).toEqual({})
  })
})

describe('dimensionSummary', () => {
  const none = { width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null }

  it('describes straight pieces, corners and U-shapes', () => {
    expect(dimensionSummary({ ...none, width_cm: 198, depth_cm: 94, height_cm: 97 })).toBe('W 198 · D 94 · H 97 cm')
    expect(dimensionSummary({ ...none, width_cm: 192 })).toBe('W 192 cm')
    expect(dimensionSummary({ width_cm: 240, depth_cm: 95, height_cm: 90, side_a_cm: 240, side_b_cm: 190 })).toBe(
      '240 × 190 cm · D 95 · H 90 cm',
    )
    expect(dimensionSummary({ ...none, width_cm: 290, side_a_cm: 290, side_b_cm: 290 })).toBe('290 × 290 cm')
    expect(dimensionSummary({ width_cm: 300, depth_cm: 90, height_cm: 95, side_a_cm: 240, side_b_cm: 180 })).toBe(
      '240 × 300 × 180 cm · D 90 · H 95 cm',
    )
    expect(dimensionSummary({ ...none, width_cm: 168.5 })).toBe('W 168.5 cm')
    expect(dimensionSummary(none)).toBeNull()
  })
})

describe('catalogueIssues', () => {
  const base = { width_cm: 200, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null, gallery_images: [] as string[] }
  const variant = { image_url: 'https://example.test/a.png', colour_name: 'Grey', is_active: true }

  it('is empty for a complete product', () => {
    expect(catalogueIssues({ ...base, variants: [variant] })).toEqual([])
  })

  it('flags what a shopper would miss', () => {
    expect(catalogueIssues({ ...base, variants: [] })).toEqual(['no-colourways', 'no-photo'])
    expect(catalogueIssues({ ...base, width_cm: null, variants: [{ ...variant, image_url: null, colour_name: null }] })).toEqual([
      'no-photo', 'unnamed-colour', 'no-dimensions',
    ])
    // A gallery photo counts; hidden colourways don't.
    expect(catalogueIssues({ ...base, gallery_images: ['https://example.test/g.png'], variants: [{ ...variant, image_url: null }] })).toEqual([])
    expect(catalogueIssues({ ...base, variants: [{ ...variant, is_active: false }] })).toEqual(['no-colourways', 'no-photo'])
  })
})
