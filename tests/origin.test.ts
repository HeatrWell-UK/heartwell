import { describe, expect, it } from 'vitest'
import { canonicalHostRedirect, externalOrigin, safeNextPath } from '@/lib/http/origin'

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
