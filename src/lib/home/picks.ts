// What the home page picks from the catalogue. Pure functions, so they're tested.
import type { FabricCollection, RangeSummary } from '@/lib/catalogue/listing'

/** Photographed ranges, the ones with featured pieces first, otherwise in the catalogue's order. */
export function homeRanges(ranges: RangeSummary[], count = 8): RangeSummary[] {
  const shown = ranges.filter((r) => r.image)
  const featured = (r: RangeSummary) => (r.products.some((p) => p.featured) ? 0 : 1)
  return shown
    .map((r, i) => ({ r, i }))
    .sort((a, b) => featured(a.r) - featured(b.r) || a.i - b.i)
    .slice(0, count)
    .map(({ r }) => r)
}

export interface HomeSwatch {
  code: string
  name: string
  hex: string
  collection: string
}

function hsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}

/**
 * Colours the home page shows as a swatch card. The owner doesn't want green,
 * pink or orange anywhere on the shop's own pages (the fabrics themselves stay
 * on sale and on the fabrics page), so those hues are left out here.
 */
export function isShowcaseColour(hex: string): boolean {
  const c = hsl(hex)
  if (!c) return false
  const { h, s, l } = c
  if (s < 0.12) return true // greys, creams, blacks
  if (h >= 60 && h < 200) return false // greens, teals and turquoise
  if ((h >= 290 || h < 12) && l > 0.55) return false // pinks
  if (h >= 12 && h < 50 && s > 0.55) return false // oranges and mustard
  return true
}

const distance = (a: string, b: string) => {
  const p = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!)
}

/** Just what picking swatches needs, so the product page's fabric collections work too. */
type SwatchSource = Pick<FabricCollection, 'name'> & { fabrics: Pick<FabricCollection['fabrics'][number], 'code' | 'name' | 'hex'>[] }

/** Up to `count` distinct showcase colours across the collections, light to dark, spread evenly. */
export function homeSwatches(collections: SwatchSource[], count = 16): HomeSwatch[] {
  const pool: HomeSwatch[] = []
  for (const c of collections) {
    for (const f of c.fabrics) {
      const hex = f.hex?.toUpperCase()
      if (!hex || !/^#[0-9A-F]{6}$/.test(hex) || !isShowcaseColour(hex)) continue
      if (pool.some((p) => p.name === f.name || distance(p.hex, hex) < 18)) continue
      pool.push({ code: f.code, name: f.name, hex, collection: c.name })
    }
  }
  pool.sort((a, b) => (hsl(b.hex)?.l ?? 0) - (hsl(a.hex)?.l ?? 0))
  if (pool.length <= count) return pool
  const step = (pool.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, i) => pool[Math.round(i * step)]!)
}
