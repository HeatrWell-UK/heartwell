import { describe, expect, it } from 'vitest'
import { CODE, errorCodeFor, fieldCategoryFor, JOURNEY_EVENTS, pageTypeFor } from '@/lib/journey/taxonomy'
import { periodFrom, periodHref, pct } from '@/lib/admin/period'

describe('journey taxonomy (codes, never content)', () => {
  it.each([
    ['/', 'home'],
    ['/products/oakland-3-seater', 'product'],
    ['/ranges/oakland', 'range'],
    ['/sale', 'sale'],
    ['/christmas', 'season'],
    ['/new-year', 'season'],
    ['/basket', 'basket'],
    ['/checkout', 'checkout'],
    ['/order/abc', 'order'],
    ['/faq', 'info'],
    ['/corner-sofas', 'category'],
    ['/sofas/corner-sofas', 'category'],
  ])('%s is a %s page', (path, type) => {
    expect(pageTypeFor(path)).toBe(type)
  })

  it('names the kind of field from its name, never its value', () => {
    expect(fieldCategoryFor('phone', 'tel')).toBe('phone')
    expect(fieldCategoryFor('postcode')).toBe('postcode')
    expect(fieldCategoryFor('email')).toBe('email')
    expect(fieldCategoryFor('name', 'name')).toBe('name')
    expect(fieldCategoryFor('date')).toBe('delivery_date')
    expect(fieldCategoryFor('address', 'address-line1')).toBe('address')
    expect(fieldCategoryFor('mystery')).toBe('other')
  })

  it('turns a validity state into one code', () => {
    const v = { valueMissing: false, typeMismatch: false, patternMismatch: false, tooShort: false, tooLong: false, rangeUnderflow: false, rangeOverflow: false }
    expect(errorCodeFor({ ...v, valueMissing: true })).toBe('missing')
    expect(errorCodeFor({ ...v, typeMismatch: true })).toBe('wrong_format')
    expect(errorCodeFor({ ...v, tooShort: true })).toBe('too_short')
    expect(errorCodeFor(v)).toBe('invalid')
  })

  it('every event name fits the database rule', () => {
    for (const e of JOURNEY_EVENTS) expect(e).toMatch(/^[a-z_]{2,40}$/)
    expect('07700 900000').not.toMatch(CODE)
    expect('someone@example.com').not.toMatch(CODE)
    expect('SW1A 1AA').not.toMatch(CODE)
  })
})

describe('report periods (UK days)', () => {
  const now = new Date('2026-11-24T16:30:00Z')
  it('defaults to the last 30 days, to the end of today', () => {
    const p = periodFrom({}, now)
    expect(p).toMatchObject({ key: '30d', from: '2026-10-26T00:00:00.000Z', to: '2026-11-25T00:00:00.000Z', device: null, source: null })
  })
  it('today, 7 days, this month', () => {
    expect(periodFrom({ period: 'today' }, now)).toMatchObject({ from: '2026-11-24T00:00:00.000Z', to: '2026-11-25T00:00:00.000Z' })
    expect(periodFrom({ period: '7d' }, now).from).toBe('2026-11-18T00:00:00.000Z')
    expect(periodFrom({ period: 'month' }, now).from).toBe('2026-11-01T00:00:00.000Z')
  })
  it('custom dates in either order, capped at a year; summer days start at 23:00 UTC', () => {
    expect(periodFrom({ period: 'custom', from: '2026-11-20', to: '2026-11-10' }, now)).toMatchObject({ from: '2026-11-10T00:00:00.000Z', to: '2026-11-21T00:00:00.000Z' })
    expect(periodFrom({ period: 'custom', from: '2026-07-01', to: '2026-07-01' }, now)).toMatchObject({ from: '2026-06-30T23:00:00.000Z', to: '2026-07-01T23:00:00.000Z' })
  })
  it('ignores unknown filters and keeps known ones in links', () => {
    const p = periodFrom({ device: 'fridge', source: 'meta' }, now)
    expect(p.device).toBeNull()
    expect(periodHref('/admin/website', p, { period: '7d' })).toBe('/admin/website?period=7d&source=meta')
    expect(pct(1, 3)).toBe('33.3%')
    expect(pct(1, 0)).toBe('–')
  })
})
