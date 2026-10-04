import { describe, expect, it } from 'vitest'
import {
  addLine,
  basketCount,
  basketSubtotal,
  MAX_LINES,
  MAX_QUANTITY,
  parseBasket,
  parseSaved,
  refreshLines,
  removeLine,
  setQuantity,
  toggleSaved,
  type BasketLine,
  type BasketLineView,
} from '@/lib/basket/model'

const V1 = '11111111-1111-4111-8111-111111111111'
const V2 = '22222222-2222-4222-8222-222222222222'
const M1 = '33333333-3333-4333-8333-333333333333'
const view = (price: number, extra: Partial<BasketLineView> = {}): BasketLineView => ({
  slug: 'sample-sofa',
  sku: 'S-1',
  title: 'Sample Sofa',
  option: 'Grey',
  image: null,
  unitPrice: price,
  madeToOrder: false,
  ...extra,
})

describe('basket lines', () => {
  it('adds a line, then adds to the same colourway and fabric instead of duplicating it', () => {
    let lines: BasketLine[] = []
    lines = addLine(lines, { variantId: V1, materialId: null, view: view(749) }, 'a', 1)
    lines = addLine(lines, { variantId: V1, materialId: null, view: view(749) }, 'b', 2)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ id: 'a', quantity: 2 })
    // The same colourway in a chosen fabric is a separate line.
    lines = addLine(lines, { variantId: V1, materialId: M1, view: view(749, { option: 'Blue' }) }, 'c', 3)
    expect(lines).toHaveLength(2)
    expect(basketCount(lines)).toBe(3)
    expect(basketSubtotal(lines)).toBe(2247)
  })

  it('keeps quantities between 1 and the maximum', () => {
    let lines = addLine([], { variantId: V1, materialId: null, view: view(10), quantity: 50 }, 'a', 1)
    expect(lines[0]!.quantity).toBe(MAX_QUANTITY)
    lines = setQuantity(lines, 'a', 0)
    expect(lines[0]!.quantity).toBe(1)
    lines = setQuantity(lines, 'a', 3.7)
    expect(lines[0]!.quantity).toBe(3)
  })

  it('stops at the maximum number of lines', () => {
    let lines: BasketLine[] = []
    for (let i = 0; i < MAX_LINES + 2; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
      lines = addLine(lines, { variantId: id, materialId: null, view: view(1) }, `l${i}`, i)
    }
    expect(lines).toHaveLength(MAX_LINES)
  })

  it('removes lines, and refreshes or drops them from fresh catalogue details', () => {
    let lines = addLine([], { variantId: V1, materialId: null, view: view(749) }, 'a', 1)
    lines = addLine(lines, { variantId: V2, materialId: null, view: view(500) }, 'b', 2)
    expect(removeLine(lines, 'a').map((l) => l.id)).toEqual(['b'])
    const refreshed = refreshLines(lines, { a: view(799), b: null })
    expect(refreshed).toHaveLength(1)
    expect(refreshed[0]!.view.unitPrice).toBe(799)
    // Lines the refresh didn't cover are kept as they are.
    expect(refreshLines(lines, {})).toHaveLength(2)
  })
})

describe('reading stored data', () => {
  it('keeps only well-formed lines and never throws', () => {
    const good = { id: 'a', variantId: V1, materialId: null, quantity: 2, addedAt: 1, view: view(749) }
    expect(parseBasket([good])).toHaveLength(1)
    for (const bad of [null, 'text', 42, {}, [null], [{ ...good, variantId: 'not-a-uuid' }], [{ ...good, view: { ...view(749), unitPrice: -1 } }]]) {
      expect(parseBasket(bad)).toEqual([])
    }
    expect(parseBasket([{ ...good, quantity: 500 }])[0]!.quantity).toBe(MAX_QUANTITY)
  })

  it('toggles saved items by product and reads them back safely', () => {
    let saved = toggleSaved([], 'sample-sofa', 'S-1', 1)
    expect(saved).toEqual([{ slug: 'sample-sofa', sku: 'S-1', savedAt: 1 }])
    saved = toggleSaved(saved, 'sample-sofa', 'S-2', 2)
    expect(saved).toEqual([])
    expect(parseSaved([{ slug: 'ok-slug', sku: null }, { slug: 'Not OK!' }, 7])).toEqual([{ slug: 'ok-slug', sku: null, savedAt: 0 }])
  })
})
