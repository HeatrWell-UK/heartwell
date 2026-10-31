// Close-ups for the product page and the feeds (audit A2), from the list in
// src/content/close-ups.ts. Pure: the photos come in, picked and cut out.

import { CLOSE_UPS, type CloseUp } from '@/content/close-ups'

/** A colourway of a close-up's source piece and its photo. */
export interface CloseUpPhoto {
  colour: string | null
  material: string | null
  src: string
}

/** One close-up as the product page gets it: the square, and the photos it may be cut from (the first is where it was measured). */
export interface CloseUpSource {
  label: string
  x: number
  y: number
  s: number
  material: string | null
  photos: CloseUpPhoto[]
}

/** A close-up picked for a colourway: the cut-out photo, and the colourway it shows. */
export interface PickedCloseUp {
  label: string
  src: string
  colour: string | null
  material: string | null
  /** Its side in the original photo's pixels (how sharp it can be). */
  size: number
}

const key = (colour: string | null, material: string | null) => `${colour ?? ''} ${material ?? ''}`.trim().toLowerCase()

const CLOUDINARY_PLAIN = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/

/** The square cut from a plain Cloudinary photo, then `after` (a resize), or null for any other link. */
export function cropUrl(src: string, c: { x: number; y: number; s: number }, after?: string): string | null {
  const m = CLOUDINARY_PLAIN.exec(src)
  if (!m) return null
  return `${m[1]}c_crop,x_${c.x},y_${c.y},w_${c.s},h_${c.s}/${after ? `${after}/` : ''}${m[2]}`
}

/**
 * The range's close-ups that apply to this piece, each with the photos it can
 * be cut from: the colourway it was measured on first, then the others it was
 * checked on. `photosOf` gives a source piece's colourways with photos, in order.
 */
export function closeUpSources(rangeSlug: string | null, pieceSlug: string, photosOf: (slug: string) => CloseUpPhoto[]): CloseUpSource[] {
  const list = rangeSlug ? (CLOSE_UPS[rangeSlug] ?? []) : []
  return list.flatMap((c: CloseUp) => {
    if (c.piece && !pieceSlug.includes(c.piece)) return []
    const all = photosOf(c.photo)
    const checked = c.colours ? c.colours.flatMap((name) => all.filter((p) => key(p.colour, p.material) === name.toLowerCase())) : all.slice(0, 1)
    if (checked.length === 0) return []
    return [{ label: c.label, x: c.x, y: c.y, s: c.s, material: c.material ?? null, photos: checked }]
  })
}

/**
 * The close-ups for the colourway on show: cut from that colourway's photo
 * when the square was checked on it, else from the first. A close-up that
 * names a cover is left out for other covers, and once another fabric is chosen.
 */
export function pickCloseUps(
  sources: CloseUpSource[],
  shown: { colour: string | null; material: string | null } | null,
  fabricChosen: boolean,
): PickedCloseUp[] {
  const want = shown ? key(shown.colour, shown.material) : ''
  return sources.flatMap((c) => {
    if (c.material && (fabricChosen || !sameCover(c.material, shown?.material ?? null))) return []
    const photo = c.photos.find((p) => key(p.colour, p.material) === want) ?? c.photos[0]
    const src = photo ? cropUrl(photo.src, c) : null
    return photo && src ? [{ label: c.label, src, colour: photo.colour, material: photo.material, size: c.s }] : []
  })
}

const sameCover = (a: string, b: string | null) => a.toLowerCase() === (b ?? '').toLowerCase()

/**
 * Close-ups for a feed item: only those cut from the item's own colourway
 * (an ad never shows another colour), resized by `after` (given the square's side).
 */
export function feedCloseUps(sources: CloseUpSource[], item: { colour: string | null; material: string | null }, after: (size: number) => string): string[] {
  const want = key(item.colour, item.material)
  return sources.flatMap((c) => {
    if (c.material && !sameCover(c.material, item.material)) return []
    const photo = c.photos.find((p) => key(p.colour, p.material) === want)
    const url = photo ? cropUrl(photo.src, c, after(c.s)) : null
    return url ? [url] : []
  })
}
