// A range's sizes for its page: one entry per size with each back style's
// price, and the top-view plans every size is drawn with, to one scale.
// Pure functions, so they're tested.

import type { Layout } from '@/lib/product/measurements'
import type { ListingProduct } from './listing-types'

/** "3 Seater" -> "3 seater", "Armed U-Shape" -> "Armed U-shape", "4 Seater Corner 2c1" -> "4 seater corner 2c1". */
export function sizeLabel(value: string): string {
  const words = value
    .trim()
    .split(/\s+/)
    .map((w) => (/^[A-Z]-/.test(w) ? `${w[0]}${w.slice(1).toLowerCase()}` : w.toLowerCase()))
    .join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export interface RangeSizeOption {
  /** The back style ("High back"), or null in a range with one style. */
  style: string | null
  slug: string
  price: number
  /** More than one colour, so the price is where it starts. */
  from: boolean
}

export interface RangeSize {
  key: string
  label: string
  plan: Layout | null
  seats: number | null
  options: RangeSizeOption[]
}

/**
 * One entry per size, in the range's order. Each lists its back styles in the
 * order the range shows them, so "High back" and "Scattered back" line up
 * from one size to the next.
 */
export function rangeSizes(products: ListingProduct[]): RangeSize[] {
  const sorted = [...products].sort((a, b) => a.sort - b.sort)
  const styles = [...new Set(sorted.map((p) => p.axis2Value).filter((v): v is string => Boolean(v)))]
  const sizes = new Map<string, ListingProduct[]>()
  for (const p of sorted) {
    const key = p.axis1Value ?? p.slug
    sizes.set(key, [...(sizes.get(key) ?? []), p])
  }
  return [...sizes].map(([key, group]) => {
    const byStyle = [...group].sort((a, b) => styles.indexOf(a.axis2Value ?? '') - styles.indexOf(b.axis2Value ?? ''))
    const first = byStyle[0]!
    return {
      key,
      label: first.axis1Value ? sizeLabel(first.axis1Value) : first.title,
      plan: byStyle.find((p) => p.plan)?.plan ?? null,
      seats: first.seats,
      options: byStyle.map((p) => ({
        style: styles.length > 1 && p.axis2Value ? sizeLabel(p.axis2Value) : null,
        slug: p.slug,
        price: p.price,
        from: p.colours.length > 1,
      })),
    }
  })
}

/**
 * A photo for each size that has one of its own, in the range's order: not the
 * range's cover and not one another size already shows (some sizes share a
 * photo). For the alcoves beside a range's cover.
 */
export function sizePhotos(products: ListingProduct[], sizes: RangeSize[], cover: string | null): { size: RangeSize; image: string }[] {
  const used = new Set(cover ? [cover] : [])
  const photos: { size: RangeSize; image: string }[] = []
  for (const size of sizes) {
    const slugs = new Set(size.options.map((o) => o.slug))
    const image = products.find((p) => slugs.has(p.slug) && p.image && !used.has(p.image))?.image
    if (!image) continue
    used.add(image)
    photos.push({ size, image })
  }
  return photos
}

/** Space left between the two pieces of a set, in centimetres. */
export const SET_GAP_CM = 20
/** Depth a drawing assumes when it isn't known (never labelled as a measurement). */
export const ASSUMED_DEPTH_CM = 90

/** How much floor a plan covers, in centimetres: across, and front to back. */
export function planExtent(layout: Layout): { w: number; d: number } {
  switch (layout.kind) {
    case 'straight':
      return { w: layout.w, d: layout.d ?? ASSUMED_DEPTH_CM }
    case 'corner':
      return { w: layout.top, d: layout.left }
    case 'u':
      return { w: layout.back, d: Math.max(layout.left, layout.right) }
    case 'set':
      return {
        w: layout.pieces.reduce((n, p) => n + p.w, 0) + SET_GAP_CM * (layout.pieces.length - 1),
        d: Math.max(...layout.pieces.map((p) => p.d ?? ASSUMED_DEPTH_CM)),
      }
  }
}

/** The frame every plan of a range is drawn in, so they all share one scale. */
export function planFrame(layouts: (Layout | null)[]): { w: number; d: number } | null {
  const extents = layouts.filter((l): l is Layout => l !== null).map(planExtent)
  if (extents.length === 0) return null
  return { w: Math.max(...extents.map((e) => e.w)), d: Math.max(...extents.map((e) => e.d)) }
}

const cm = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} cm`

/** The measurement people compare first: "198 cm wide", "240 × 190 cm", "198 cm and 168 cm wide". */
export function planSummary(layout: Layout): string {
  switch (layout.kind) {
    case 'straight':
      return `${cm(layout.w)} wide`
    case 'corner':
      return layout.top === layout.left ? `${cm(layout.top)} each way` : `${layout.top} × ${cm(layout.left)}`
    case 'u':
      return `${cm(layout.back)} wide, ${layout.left === layout.right ? `sides ${cm(layout.left)}` : `sides ${layout.left} and ${cm(layout.right)}`}`
    case 'set':
      return `${layout.pieces.map((p) => cm(p.w)).join(' and ')} wide`
  }
}
