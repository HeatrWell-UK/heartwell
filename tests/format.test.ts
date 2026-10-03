import { describe, expect, it } from 'vitest'
import { formatLongDate, formatPrice, formatShortDate, ukDate } from '@/lib/format'

describe('formatPrice', () => {
  it('shows whole pounds without pence', () => {
    expect(formatPrice(749)).toBe('£749')
    expect(formatPrice(1249)).toBe('£1,249')
  })

  it('shows pence when there are any', () => {
    expect(formatPrice(12.5)).toBe('£12.50')
  })
})

describe('dates', () => {
  it('writes long dates the British way', () => {
    expect(formatLongDate(new Date('2026-10-06T12:00:00Z'))).toBe('Tuesday 6 October')
  })

  it('never puts a comma in a date, with or without the year', () => {
    const d = new Date('2027-01-09T12:00:00Z')
    expect(ukDate(d, { year: true })).toBe('Saturday 9 January 2027')
    expect(ukDate(d, { weekday: false, year: true })).toBe('9 January 2027')
  })

  it('uses UK time, not UTC, for the day', () => {
    // 23:30 UTC on 30 September is already 1 October in London (BST).
    expect(formatShortDate(new Date('2026-09-30T23:30:00Z'))).toBe('01/10/2026')
  })
})
