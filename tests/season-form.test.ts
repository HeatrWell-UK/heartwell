import { describe, expect, it } from 'vitest'
import { checkSeason, isoToLondonLocal, londonLocalToIso, seasonDraft } from '@/lib/admin/season-form'

describe('season form (UK time)', () => {
  it('converts UK wall-clock time to instants, winter and summer', () => {
    expect(londonLocalToIso('2027-02-01T00:00')).toBe('2027-02-01T00:00:00.000Z')
    expect(londonLocalToIso('2027-07-01T09:30')).toBe('2027-07-01T08:30:00.000Z')
    expect(londonLocalToIso('nonsense')).toBeNull()
    expect(isoToLondonLocal('2027-07-01T08:30:00.000Z')).toBe('2027-07-01T09:30')
    expect(isoToLondonLocal('2026-11-24T18:00:00Z')).toBe('2026-11-24T18:00')
  })

  it('round-trips the status into a draft and back', () => {
    const d = seasonDraft({
      enabled: true, starts_at: '2026-11-24T18:00:00Z', ends_at: '2027-02-01T00:00:00Z', amount: 50, window_hours: 336, generation: 'g',
      live_now: true, windows_this_generation: 0, windows_live: 0, windows_ended: 0, archived: 0, eligible_products: 79, excluded_products: ['Sims Footstool'],
    })
    expect(d.windowDays).toBe('14')
    expect(checkSeason(d).input).toEqual({ enabled: true, starts_at: '2026-11-24T18:00:00.000Z', ends_at: '2027-02-01T00:00:00.000Z', window_hours: 336, new_generation: false })
  })

  it('refuses an end before the start and silly windows', () => {
    const base = { enabled: true, startsLocal: '2027-01-01T00:00', endsLocal: '2026-12-01T00:00', windowDays: '14', newGeneration: false }
    expect(checkSeason(base).input).toBeNull()
    expect(checkSeason({ ...base, endsLocal: '2027-02-01T00:00', windowDays: '0' }).input).toBeNull()
    expect(checkSeason({ ...base, endsLocal: '2027-02-01T00:00', windowDays: '120' }).input).toBeNull()
  })
})
