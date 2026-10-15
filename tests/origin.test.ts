import { describe, expect, it } from 'vitest'
import { canonicalHostRedirect, externalOrigin, safeNextPath } from '@/lib/http/origin'
import { visitorAddress } from '@/lib/http/visitor'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/admin/status')).toBe('/admin/status')
  })

  it('refuses anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'admin', '', null, undefined, 42]) {
      expect(safeNextPath(bad)).toBe('/admin')
    }
  })
})

describe('externalOrigin', () => {
  const headers = (h: Record<string, string>) => new Headers(h)

  it('uses the forwarded host when it is one of ours', () => {
    expect(externalOrigin(headers({ 'x-forwarded-host': 'heartwell-staging.vercel.app', 'x-forwarded-proto': 'https' }))).toBe(
      'https://heartwell-staging.vercel.app',
    )
    expect(externalOrigin(headers({ host: 'localhost:3000' }))).toBe('http://localhost:3000')
  })

  it('ignores a forged forwarded host', () => {
    expect(externalOrigin(headers({ 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' }))).toBe(
      'https://heartwellsofa.co.uk',
    )
  })
})

describe('visitorAddress', () => {
  it('reads from the right, so an address the visitor typed is never trusted', () => {
    // Vercel: the header is replaced with the visitor's address.
    expect(visitorAddress('1.1.1.1', null, 0)).toBe('1.1.1.1')
    // Hostinger: visitor, then its CDN edge and one more hop.
    expect(visitorAddress('1.1.1.1, 10.0.0.1, 10.0.0.2', '10.0.0.2', 2)).toBe('1.1.1.1')
    // A made-up entry (shown twice by Hostinger) changes nothing.
    expect(visitorAddress('6.6.6.6, 6.6.6.6, 1.1.1.1, 10.0.0.1, 10.0.0.2', '10.0.0.2', 2)).toBe('1.1.1.1')
  })

  it('falls back sensibly when the header is short or missing', () => {
    expect(visitorAddress('1.1.1.1', null, 2)).toBe('1.1.1.1')
    expect(visitorAddress(null, '2.2.2.2', 2)).toBe('2.2.2.2')
    expect(visitorAddress('', null)).toBe('unknown')
  })
})

describe('canonicalHostRedirect', () => {
  const headers = (h: Record<string, string>) => new Headers(h)

  it('moves www. to the same page on the bare domain', () => {
    expect(canonicalHostRedirect(headers({ host: 'www.heartwellsofa.co.uk' }), '/sofas/corner-sofas?sort=price')).toBe(
      'https://heartwellsofa.co.uk/sofas/corner-sofas?sort=price',
    )
    expect(canonicalHostRedirect(headers({ 'x-forwarded-host': 'WWW.heartwellsofa.co.uk' }), '/')).toBe('https://heartwellsofa.co.uk/')
  })

  it('leaves every other host alone', () => {
    for (const host of ['heartwellsofa.co.uk', 'heartwellfurniture.vercel.app', 'localhost:3000', 'www.evil.example', 'www.heartwellfurniture.co.uk']) {
      expect(canonicalHostRedirect(headers({ host }), '/')).toBeNull()
    }
  })
})
