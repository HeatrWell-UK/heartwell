// TypeScript and SQL must agree: the website shows these answers and the
// database charges them. The fixture holds the database's own answers.

import { describe, expect, it } from 'vitest'
import fixture from './fixtures/delivery-parity.json'
import { classifyDeliveryPostcode, normalisePostcode, type MixedAreaEvidence } from '@/lib/delivery/postcode'
import { quoteDelivery, type DeliverySettings } from '@/lib/delivery/pricing'

type PostcodeRow = [string, MixedAreaEvidence | null, string, string | null, string]
type DeliveryRow = [number, boolean, boolean, boolean, number | null, number, number, number | null, number, number]

describe('postcode classification matches public.classify_postcode', () => {
  for (const [input, evidence, kind, zone, reason] of fixture.postcodes as PostcodeRow[]) {
    it(`${JSON.stringify(input)}${evidence ? ` (${evidence})` : ''} -> ${zone ?? kind} ${reason}`, () => {
      const result = classifyDeliveryPostcode(input, evidence)
      expect(result.kind).toBe(kind)
      expect(result.reason).toBe(reason)
      expect(result.kind === 'classified' ? result.zone : null).toBe(zone)
    })
  }
})

describe('delivery extras match public.quote_delivery', () => {
  const settings = fixture.settings as DeliverySettings
  for (const row of fixture.delivery as DeliveryRow[]) {
    const [floor, hasLift, assembly, removal, removalSeats, upstairsOut, assemblyOut, seatsOut, removalOut, totalOut] = row
    it(`floor ${floor}${hasLift ? ' lift' : ''}${assembly ? ' assembly' : ''}${removal ? ` removal ${removalSeats}` : ''} -> £${totalOut}`, () => {
      const q = quoteDelivery({ floor, hasLift, assembly, removal, removalSeats }, settings)
      expect([q.upstairs, q.assembly, q.removalSeats, q.removal, q.total]).toEqual([upstairsOut, assemblyOut, seatsOut, removalOut, totalOut])
    })
  }
})

describe('normalisePostcode', () => {
  it('matches public.normalise_postcode', () => {
    expect(normalisePostcode(' m11ae ')).toBe('M1 1AE')
    expect(normalisePostcode('sw1a1aa')).toBe('SW1A 1AA')
    expect(normalisePostcode('ab1')).toBe('AB1')
  })
})
