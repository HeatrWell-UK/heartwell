import { describe, expect, it } from 'vitest'
import { INDEXNOW_KEY, indexNowAllowed, indexNowBody } from '@/lib/seo/indexnow'
import { organizationJsonLd, storeJsonLd, websiteJsonLd } from '@/lib/product/seo'
import { POLICIES } from '@/config/promises'

const SITE = 'https://heartwellsofa.co.uk'

describe('IndexNow', () => {
  it('announces only from the live, indexable shop', () => {
    expect(indexNowAllowed(SITE, 'production', true)).toBe(true)
    expect(indexNowAllowed(SITE, 'staging', true)).toBe(false)
    expect(indexNowAllowed(SITE, 'production', false)).toBe(false)
    expect(indexNowAllowed('https://heartwellfurniture.vercel.app', 'production', true)).toBe(false)
  })

  it('sends full addresses on this site once each, with the key and where to find it', () => {
    const body = indexNowBody(['/products/a', '/products/a', `${SITE}/ranges/b`, 'https://elsewhere.example/x'], SITE)
    expect(body).toEqual({
      host: 'heartwellsofa.co.uk',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: [`${SITE}/products/a`, `${SITE}/ranges/b`],
    })
  })
})

describe('structured data for the shop', () => {
  it('describes the shop with its return policy and showroom', () => {
    const org = organizationJsonLd(SITE)
    expect(org['@type']).toBe('OnlineStore')
    expect(org.alternateName).toContain('Heartwell Sofa')
    expect(org.hasMerchantReturnPolicy).toMatchObject({
      applicableCountry: 'GB',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: POLICIES.changeOfMindDays,
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    })
    expect(org.location).toEqual({ '@id': `${SITE}/visit-us#store` })
  })

  it('names the site for search results', () => {
    expect(websiteJsonLd(SITE)).toMatchObject({ '@type': 'WebSite', name: 'Heartwell', url: `${SITE}/` })
  })

  it('gives the showroom its place on the map and its opening hours', () => {
    const store = storeJsonLd(SITE, 'https://maps.example')!
    expect(store['@id']).toBe(`${SITE}/visit-us#store`)
    expect(store.address).toMatchObject({ addressLocality: 'Burnley', addressRegion: 'Lancashire', postalCode: 'BB10 2AF' })
    expect(store.geo).toMatchObject({ '@type': 'GeoCoordinates' })
    expect(store.openingHoursSpecification?.[0]).toMatchObject({ opens: '09:00', closes: '17:00' })
    expect(store.parentOrganization).toEqual({ '@id': `${SITE}/#organization` })
  })
})
