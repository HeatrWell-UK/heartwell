import { describe, expect, it } from 'vitest'
import { describeProduct, type DescribedPiece } from '../scripts/catalogue/catalogue-copy.mjs'

const piece: DescribedPiece = { copyKey: 'bishop', width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null, made_to_order: true }
const sizeLine = (p: Partial<DescribedPiece>) => describeProduct({ ...piece, ...p }, ['Silver']).description?.split('\n\n')[1]

describe('describeProduct', () => {
  it('gives a U-shape its back as well as its sides', () => {
    expect(sizeLine({ width_cm: 300, side_a_cm: 180, side_b_cm: 180 })).toBe(
      'It is 300 cm across the back with two 180 cm sides. Made to order in the UK. Choose Silver, or any fabric from our library.',
    )
    expect(sizeLine({ width_cm: 300, side_a_cm: 240, side_b_cm: 180, depth_cm: 95, height_cm: 90 })).toBe(
      'It is 300 cm across the back with sides of 240 cm and 180 cm, 95 cm deep and 90 cm high. Made to order in the UK. Choose Silver, or any fabric from our library.',
    )
  })

  it('keeps a corner as its two sides', () => {
    expect(sizeLine({ width_cm: 240, side_a_cm: 240, side_b_cm: 240, depth_cm: 90, height_cm: 90 })).toMatch(/^It measures 240 cm by 240 cm, 90 cm deep and 90 cm high\./)
  })
})
