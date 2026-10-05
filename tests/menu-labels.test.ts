import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))

describe('menu labels', () => {
  it('turns category names into sentence case', async () => {
    const { sentenceCase } = await import('@/lib/catalogue/listing')
    expect(sentenceCase('U-Shaped Sofas')).toBe('U-shaped sofas')
    expect(sentenceCase('3+2 Sofa Sets')).toBe('3+2 sofa sets')
    expect(sentenceCase('Armchairs & Footstools')).toBe('Armchairs & footstools')
    expect(sentenceCase('Corner Sofas')).toBe('Corner sofas')
  })
})
