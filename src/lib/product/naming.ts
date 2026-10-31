// What a piece is called where people search (audit A3): the product's own
// title names its size ("Ashton 5 Seater Corner High Back") but never says
// "sofa", which is what people type ("ashton corner sofa", "grey velvet corner
// sofa"). These add the word, and the cover, from the piece's own data, for the
// page's title and heading only: the product's title in the database (orders,
// OrderFlow, the feeds) stays as it is.

import type { Shape } from '@/lib/catalogue/clean'

const NOUNS = /\b(sofa|sofas|armchair|chair|footstool|stool)\b/i

/**
 * A size with the noun people search for: "5 Seater Corner" → "5 Seater Corner
 * Sofa", "U-Shape" → "U-Shaped Sofa", "3+2 Seater" → "3+2 Seater Sofa Set",
 * "4 Seater Corner 1c2" → "4 Seater Corner Sofa 1c2". Armchairs, footstools and
 * family sets keep their own words.
 */
export function withNoun(size: string, shape: Shape | string | null, typeName: string): string {
  if (NOUNS.test(size) || typeName.toLowerCase() !== 'sofa' || /family set/i.test(size)) return size
  if (/\bu-shape\b/i.test(size)) return size.replace(/\bu-shape\b/i, (m) => `${m}d Sofa`)
  if (/\bl-shape\b/i.test(size)) return size.replace(/\bl-shape\b/i, (m) => `${m}d Sofa`)
  if (size.includes('+') || shape === 'set') return `${size} Sofa Set`
  // After the last "Seater" or "Corner", so a hand ("1c2") stays at the end.
  const at = [...size.matchAll(/\b(seater|corner)\b/gi)].at(-1)
  if (at?.index !== undefined) {
    const end = at.index + at[0].length
    return `${size.slice(0, end)} Sofa${size.slice(end)}`
  }
  return `${size} Sofa`
}

const words = (s: string) => s.trim().replace(/\s+/g, ' ')

/** The cover in a title: the colour and cover of a piece in one colourway, the cover when every colourway shares one, else nothing. */
export function coverWords(variants: { colourName: string | null; materialLabel: string | null }[]): string | null {
  const named = variants.filter((v) => v.colourName || v.materialLabel)
  if (named.length === 0) return null
  if (named.length === 1) return words([named[0]!.colourName, named[0]!.materialLabel].filter(Boolean).join(' ')) || null
  const covers = [...new Set(named.map((v) => v.materialLabel?.trim()).filter(Boolean))]
  // "Fabric" alone says nothing a sofa page doesn't; two colours of it do.
  if (covers.length !== 1) return null
  if (covers[0]!.toLowerCase() !== 'fabric') return covers[0]!
  const colours = [...new Set(named.map((v) => v.colourName).filter(Boolean))]
  return colours.length === 2 ? `${colours[0]} or ${colours[1]} Fabric` : null
}

/** About what Google shows of a title before the " | Heartwell" the layout adds. */
export const SEARCH_TITLE_MAX = 60

/**
 * The page title: "Ashton 5 Seater Corner Sofa, High Back, Grey Plush Velvet".
 * The noun goes after the size, the back style after a comma, then the cover
 * while it fits. An electric recliner the title doesn't call a recliner says so.
 */
export function searchTitle(p: {
  title: string
  typeName: string
  shape: Shape | string | null
  axis1Value: string | null
  axis2Value: string | null
  rangeName: string | null
  recliner: boolean
  variants: { colourName: string | null; materialLabel: string | null }[]
}): string {
  let t = words(p.title)
  if (p.recliner && !/recliner/i.test(t) && p.rangeName && t.startsWith(p.rangeName)) t = `${p.rangeName} Recliner${t.slice(p.rangeName.length)}`
  if (!NOUNS.test(t)) {
    const size = p.axis1Value ? words(p.axis1Value) : null
    const at = size ? t.toLowerCase().indexOf(size.toLowerCase()) : -1
    t = size && at >= 0 ? `${t.slice(0, at)}${withNoun(t.slice(at, at + size.length), p.shape, p.typeName)}${t.slice(at + size.length)}` : withNoun(t, p.shape, p.typeName)
  }
  if (p.axis2Value) {
    const back = words(p.axis2Value)
    if (t.endsWith(` ${back}`)) t = `${t.slice(0, -back.length - 1)}, ${back}`
  }
  const cover = coverWords(p.variants)
  const full = cover ? `${t}, ${cover}` : t
  return full.length <= SEARCH_TITLE_MAX ? full : t
}
