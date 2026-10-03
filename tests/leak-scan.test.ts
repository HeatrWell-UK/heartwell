import { describe, expect, it } from 'vitest'
import { buildFingerprints, createMatcher, scanLines, scanText } from '../scripts/lib/leak-scan.mjs'

// Made-up values: the real list never leaves the owner's machine.
const description =
  'The Example Lounger is a deep three seat sofa in soft boucle with a solid beech frame, pocket sprung seats and feather wrapped cushions for an easy relaxed sit every evening.'

const matcher = createMatcher(
  buildFingerprints({
    terms: [
      { category: 'brand', term: 'Example Sofa Co' },
      { category: 'contact', term: '07700 900123' },
      { category: 'contact', term: '+44 7700 900123' },
      { category: 'account', term: 'ABC123XYZ9' },
    ],
    descriptions: [description],
  }),
)

const categories = (text: string, allow?: string[]) => scanText(text, matcher, { allow }).map((f) => f.category)

describe('leak scanner', () => {
  it('finds a name however it is written', () => {
    expect(categories('Welcome to Example Sofa Co')).toEqual(['brand'])
    expect(categories('see examplesofaco.example for more')).toEqual(['brand'])
    expect(categories('EXAMPLE-SOFA-CO')).toEqual(['brand'])
  })

  it('finds a phone number however it is spaced', () => {
    expect(categories('Call 0770 090 0123')).toEqual(['contact'])
    expect(categories('wa.me/447700900123')).toEqual(['contact'])
    expect(categories('tel:+44-7700-900123')).toEqual(['contact'])
  })

  it('finds an account ID inside code', () => {
    expect(categories("const id = 'G-ABC123XYZ9'")).toEqual(['account'])
  })

  it('finds a copied description passage, even across lines', () => {
    const copied = 'Our take:\nis a deep three seat sofa in soft boucle with a solid beech frame, pocket\nsprung seats and feather wrapped cushions'
    expect(categories(copied)).toContain('description')
  })

  it('ignores unrelated text', () => {
    expect(categories('Heartwell sofas, made to order, paid for on delivery. Call 0161 496 0000.')).toEqual([])
  })

  it('lets allowed categories through', () => {
    expect(categories('Example Sofa Co', ['brand'])).toEqual([])
  })

  it('reports the right line numbers for diff lines', () => {
    const findings = scanLines([{ n: 42, text: 'ring 07700 900123' }], matcher)
    expect(findings).toEqual([{ line: 42, category: 'contact', text: '07700 900123' }])
  })

  it('refuses terms too short to match safely', () => {
    expect(() => buildFingerprints({ terms: [{ category: 'brand', term: 'abc' }], descriptions: [] })).toThrow()
  })
})
