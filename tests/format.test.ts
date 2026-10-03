import { describe, expect, it } from 'vitest'
import { formatLongDate, formatPrice, formatShortDate } from '@/lib/format'

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

  it('uses UK time, not UTC, for the day', () => {
    // 23:30 UTC on 30 September is already 1 October in London (BST).
    expect(formatShortDate(new Date('2026-09-30T23:30:00Z'))).toBe('01/10/2026')
  })
})
