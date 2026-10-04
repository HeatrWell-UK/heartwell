import { describe, expect, it } from 'vitest'
import { externalOrigin, safeNextPath } from '@/lib/http/origin'

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
      'https://heartwellfurniture.co.uk',
    )
  })
})
