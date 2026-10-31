// The colourway a tile, a related card or a product page leads with (audit
// A3): the first with a photo, passing over any the owner's no-pink rule
// (and no green or orange) would keep off the shop's own pages, by its colour
// (isShowcaseColour) or because its photo reads pink although it's named
// otherwise. The colourways themselves stay on sale and one tap away.

import { isShowcaseColour } from '@/lib/home/picks'

/** Colourways (SKU) whose photos read pink: Hannah Electric Corner's "Beige" (audit, 31 October 2026). */
export const PHOTO_READS_PINK = new Set(['HC-B'])

export function leadColourway<T>(variants: T[], view: (v: T) => { sku: string; hex: string | null; image: string | null }): T | null {
  const photographed = variants.filter((v) => view(v).image)
  const fits = (v: T) => {
    const { sku, hex } = view(v)
    return !PHOTO_READS_PINK.has(sku.toUpperCase()) && (!hex || !/^#[0-9a-f]{6}$/i.test(hex) || isShowcaseColour(hex.toUpperCase()))
  }
  return photographed.find(fits) ?? photographed[0] ?? variants[0] ?? null
}
