import { describe, expect, it } from 'vitest'
import { productRoute } from '@/lib/http/product-route'

const q = (s: string) => new URLSearchParams(s)

describe('the cached product routes (audit A4)', () => {
  it('serves a colourway or fabric from the colourway route, keeping the address', () => {
    expect(productRoute('/products/ashton-high-back-u-shape', q('variant=AHBU-G&utm_source=facebook'))).toEqual({ rewrite: '/products/ashton-high-back-u-shape/AHBU-G' })
    expect(productRoute('/products/ashton-high-back-u-shape', q('variant=AHBU-G&fabric=CH01'))).toEqual({ rewrite: '/products/ashton-high-back-u-shape/AHBU-G/CH01' })
    expect(productRoute('/products/ashton-high-back-u-shape', q('fabric=CH01'))).toEqual({ rewrite: '/products/ashton-high-back-u-shape/-/CH01' })
    expect(productRoute('/products/roma-recliner-manual-3-seater', q('variant=RR3-bl'))).toEqual({ rewrite: '/products/roma-recliner-manual-3-seater/RR3-bl' })
  })

  it('leaves the plain page, and anything that isn’t a SKU, to the plain route', () => {
    expect(productRoute('/products/ashton-high-back-u-shape', q('utm_source=facebook&fbclid=abc'))).toBeNull()
    expect(productRoute('/products/ashton-high-back-u-shape', q('variant=<script>'))).toBeNull()
    expect(productRoute('/products/ashton-high-back-u-shape', q('variant=../../admin'))).toBeNull()
    expect(productRoute('/sofas/corner-sofas', q('variant=X'))).toBeNull()
    expect(productRoute('/', q('variant=X'))).toBeNull()
  })

  it('sends the inner address, opened directly, back to the real one', () => {
    expect(productRoute('/products/ashton-high-back-u-shape/AHBU-G', q(''))).toEqual({ redirect: '/products/ashton-high-back-u-shape?variant=AHBU-G' })
    expect(productRoute('/products/ashton-high-back-u-shape/-/CH01', q('qa=1'))).toEqual({ redirect: '/products/ashton-high-back-u-shape?qa=1&fabric=CH01' })
  })
})
