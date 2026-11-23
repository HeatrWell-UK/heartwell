import { describe, expect, it } from 'vitest'
import { purchaseWindow, purchaseWindowText } from '@/lib/tracking/purchase-window'
import { tooOldForMeta } from '@/lib/tracking/meta-event'

const confirmed = '2026-11-18T13:41:37Z'

describe('a held Purchase’s time left for Meta', () => {
  it('counts down to 7 days (less a minute) after confirmation', () => {
    const w = purchaseWindow(confirmed, new Date('2026-11-23T20:00:00Z'))!
    expect(w.expired).toBe(false)
    expect(w.daysLeft).toBe(1)
    expect(w.urgent).toBe(true)
    expect(purchaseWindowText(w)).toMatch(/^Meta accepts it for \d+ more hours$/)
  })

  it('agrees with tooOldForMeta at the edge', () => {
    for (const iso of ['2026-11-25T13:40:00Z', '2026-11-25T13:41:00Z', '2026-11-25T13:42:00Z']) {
      const now = new Date(iso)
      expect(purchaseWindow(confirmed, now)!.expired).toBe(tooOldForMeta(new Date(confirmed), now))
    }
  })

  it('says plainly when it is too old', () => {
    const w = purchaseWindow('2026-11-10T17:18:09Z', new Date('2026-11-23T20:00:00Z'))!
    expect(w.expired).toBe(true)
    expect(purchaseWindowText(w)).toMatch(/^Too old for Meta now/)
  })

  it('has nothing to say without a confirmation time', () => {
    expect(purchaseWindow(null)).toBeNull()
  })
})
