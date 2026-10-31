import { describe, expect, it } from 'vitest'
import { coverWords, SEARCH_TITLE_MAX, searchTitle, withNoun } from '@/lib/product/naming'
import { leadColourway } from '@/lib/catalogue/lead'
import { sizeLabel } from '@/lib/catalogue/range-sizes'

const grey = [{ colourName: 'Grey', materialLabel: 'Plush Velvet' }]
const piece = (over: Partial<Parameters<typeof searchTitle>[0]>) =>
  searchTitle({ title: '', typeName: 'Sofa', shape: 'straight', axis1Value: null, axis2Value: null, rangeName: null, recliner: false, variants: [], ...over })

describe('the word people search for', () => {
  it('goes after the size', () => {
    expect(withNoun('5 Seater Corner', 'corner', 'Sofa')).toBe('5 Seater Corner Sofa')
    expect(withNoun('2 Seater', 'straight', 'Sofa')).toBe('2 Seater Sofa')
    expect(withNoun('3+2 Seater', 'set', 'Sofa')).toBe('3+2 Seater Sofa Set')
    expect(withNoun('U-Shape', 'u-shape', 'Sofa')).toBe('U-Shaped Sofa')
    expect(withNoun('Armed U-Shape', 'u-shape', 'Sofa')).toBe('Armed U-Shaped Sofa')
    expect(withNoun('L-Shape', 'corner', 'Sofa')).toBe('L-Shaped Sofa')
    expect(withNoun('Corner', 'corner', 'Sofa')).toBe('Corner Sofa')
    expect(withNoun('4 Seater Corner 1c2', 'corner', 'Sofa')).toBe('4 Seater Corner Sofa 1c2')
  })

  it('leaves armchairs, footstools, family sets and names that already say it', () => {
    expect(withNoun('Armchair', 'armchair', 'Armchair')).toBe('Armchair')
    expect(withNoun('Sims Footstool', 'footstool', 'Footstool')).toBe('Sims Footstool')
    expect(withNoun('Family Set', 'corner', 'Sofa')).toBe('Family Set')
    expect(withNoun('Oxford Electric Recliner Corner Sofa', 'corner', 'Sofa')).toBe('Oxford Electric Recliner Corner Sofa')
  })

  it('reads as the heading’s second line', () => {
    expect([withNoun('5 Seater Corner', 'corner', 'Sofa'), 'High Back'].map(sizeLabel).join(', ').replace(', High', ', high')).toBe('5 seater corner sofa, high back')
    expect(sizeLabel(withNoun('U-Shape', 'u-shape', 'Sofa'))).toBe('U-shaped sofa')
  })
})

describe('product page titles', () => {
  it('say sofa, the back style and the cover', () => {
    const ashton = { rangeName: 'Ashton', variants: grey }
    expect(piece({ ...ashton, title: 'Ashton 5 Seater Corner High Back', shape: 'corner', axis1Value: '5 Seater Corner', axis2Value: 'High Back' })).toBe(
      'Ashton 5 Seater Corner Sofa, High Back, Grey Plush Velvet',
    )
    expect(piece({ ...ashton, title: 'Ashton U-Shape Scattered Back', shape: 'u-shape', axis1Value: 'U-Shape', axis2Value: 'Scattered Back' })).toBe(
      'Ashton U-Shaped Sofa, Scattered Back, Grey Plush Velvet',
    )
    expect(piece({ ...ashton, title: 'Ashton 3+2 Seater High Back', shape: 'set', axis1Value: '3+2 Seater', axis2Value: 'High Back' })).toBe(
      'Ashton 3+2 Seater Sofa Set, High Back, Grey Plush Velvet',
    )
  })

  it('names a cover only when every colourway shares it, and leaves it off when the title would be too long', () => {
    expect(coverWords([{ colourName: 'Grey', materialLabel: 'Plush Velvet' }, { colourName: 'Navy Blue', materialLabel: 'Plush Velvet' }])).toBe('Plush Velvet')
    expect(coverWords([{ colourName: 'Grey', materialLabel: 'Fabric' }, { colourName: 'Beige', materialLabel: 'Fabric' }])).toBe('Grey or Beige Fabric')
    expect(coverWords([{ colourName: 'Grey', materialLabel: 'Leather Aire' }, { colourName: 'Grey', materialLabel: 'Fabric' }])).toBeNull()
    const long = piece({
      title: 'Rio Chesterfield 5 Seater Corner',
      rangeName: 'Rio Chesterfield',
      shape: 'corner',
      axis1Value: '5 Seater Corner',
      variants: [{ colourName: 'Silver Grey', materialLabel: 'Plush Velvet' }],
    })
    expect(long).toBe('Rio Chesterfield 5 Seater Corner Sofa')
    expect(long.length).toBeLessThanOrEqual(SEARCH_TITLE_MAX)
  })

  it('calls an electric recliner a recliner, and keeps titles that already say sofa', () => {
    expect(
      piece({
        title: 'Hannah Electric Corner',
        rangeName: 'Hannah Electric',
        recliner: true,
        shape: 'corner',
        axis1Value: 'Corner',
        variants: [{ colourName: 'Beige', materialLabel: 'Fabric' }, { colourName: 'Grey', materialLabel: 'Fabric' }],
      }),
    ).toBe('Hannah Electric Recliner Corner Sofa, Beige or Grey Fabric')
    expect(piece({ title: 'Roma Recliner 3 Seater Manual Sofa', rangeName: 'Roma Recliner', recliner: true, axis1Value: '3 Seater' })).toBe('Roma Recliner 3 Seater Manual Sofa')
    expect(
      piece({ title: 'Orlando Electric Recliner 3+2 Seater', recliner: true, shape: 'set', variants: [{ colourName: 'Black', materialLabel: 'Tech Leather' }, { colourName: 'Grey', materialLabel: 'Tech Leather' }] }),
    ).toBe('Orlando Electric Recliner 3+2 Seater Sofa Set, Tech Leather')
    expect(piece({ title: 'Verona Armchair High Back', typeName: 'Armchair', shape: 'armchair', rangeName: 'Verona', axis1Value: 'Armchair', axis2Value: 'High Back' })).toBe(
      'Verona Armchair, High Back',
    )
  })
})

describe('the colourway a tile leads with', () => {
  const v = (sku: string, hex: string | null, image: string | null = `https://x/${sku}.png`) => ({ sku, hex, image })
  const view = (x: ReturnType<typeof v>) => x

  it('passes over a photo that reads pink, and colours the shop doesn’t show', () => {
    expect(leadColourway([v('HC-B', '#F5F5DC'), v('HC-G', '#7D7D7D')], view)?.sku).toBe('HC-G')
    expect(leadColourway([v('T-1', '#008080'), v('G-1', '#7D7D7D')], view)?.sku).toBe('G-1')
  })

  it('still shows something when that’s all there is, and prefers a photo', () => {
    expect(leadColourway([v('HC-B', '#F5F5DC')], view)?.sku).toBe('HC-B')
    expect(leadColourway([v('A', '#7D7D7D', null), v('B', '#000000')], view)?.sku).toBe('B')
    expect(leadColourway([], view)).toBeNull()
  })
})
