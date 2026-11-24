import { describe, expect, it } from 'vitest'
import { ga4Purchase, ga4SessionIdFromCookie, ga4StreamCookie } from '@/lib/tracking/ga4-event'
import { tagsFrom } from '@/lib/tracking/browser'

describe('GA4 session join (Run 4)', () => {
  it('reads the session ID from both stream cookie formats', () => {
    expect(ga4SessionIdFromCookie('GS1.1.1732466000.3.1.1732466100.0.0.0')).toBe('1732466000')
    expect(ga4SessionIdFromCookie('GS2.1.s1732466000$o3$g1$t1732466100$j60$l0$h0')).toBe('1732466000')
    expect(ga4SessionIdFromCookie('nonsense')).toBeNull()
    expect(ga4SessionIdFromCookie(undefined)).toBeNull()
  })

  it('names the stream cookie from the measurement ID', () => {
    expect(ga4StreamCookie('G-ABC123XYZ')).toBe('_ga_ABC123XYZ')
    expect(ga4StreamCookie(null)).toBeNull()
    expect(ga4StreamCookie('UA-1')).toBeNull()
  })

  const base = { eventId: 'e1', consented: true, time: new Date('2026-11-24T12:00:00Z'), value: 649, items: [] }
  it('sends session_id only with the consented client ID it belongs to', () => {
    const withSession = ga4Purchase({ ...base, clientId: '123.456', sessionId: '1732466000' }, new Date('2026-11-24T13:00:00Z'))
    expect(withSession.events[0]!.params).toMatchObject({ session_id: '1732466000', engagement_time_msec: 1, currency: 'GBP', transaction_id: 'e1', value: 649 })
    const anonymous = ga4Purchase({ ...base, clientId: null, sessionId: '1732466000' }, new Date('2026-11-24T13:00:00Z'))
    expect(anonymous.events[0]!.params).not.toHaveProperty('session_id')
  })
})

describe('Meta URL parameters (Run 4 template)', () => {
  const q =
    '?utm_source=fb&utm_medium=paid_social&utm_campaign=HW%20Christmas&utm_content=Rio%20festive&utm_term=Broad&utm_id=120200000000000001&meta_campaign_id=120200000000000001&meta_adset_id=120200000000000002&meta_ad_id=120200000000000003&placement=Facebook_Mobile_Feed&ad_id=120200000000000003&adset_id=120200000000000002'
  it('keeps names in the utm tags and numeric IDs and placement separately', () => {
    expect(tagsFrom(q)).toEqual({
      source: 'fb',
      medium: 'paid_social',
      campaign: 'HW Christmas',
      content: 'Rio festive',
      term: 'Broad',
      utmId: '120200000000000001',
      campaignId: '120200000000000001',
      adsetId: '120200000000000002',
      adId: '120200000000000003',
      placement: 'Facebook_Mobile_Feed',
    })
  })
  it('refuses non-numeric IDs, unresolved macros and odd placements', () => {
    const t = tagsFrom('?meta_ad_id={{ad.id}}&meta_adset_id=abc&placement=<script>&utm_source=ig')
    expect(t.adId).toBeUndefined()
    expect(t.adsetId).toBeUndefined()
    expect(t.placement).toBeUndefined()
    expect(t.source).toBe('ig')
  })
  it('falls back to the older ad_id / adset_id / utm_id names', () => {
    expect(tagsFrom('?ad_id=9&adset_id=8&utm_id=7')).toMatchObject({ adId: '9', adsetId: '8', campaignId: '7' })
  })
})
