// Pure functions that turn the reference catalogue's loose fields into
// Heartwell's typed columns. No imports and erasable TypeScript only, so the
// import script can load this file directly with Node.

export interface Piece {
  label: string
  width_cm: number | null
  depth_cm: number | null
  height_cm: number | null
}

export interface Dimensions {
  width_cm: number | null
  depth_cm: number | null
  height_cm: number | null
  /** The two arms of a corner or U-shape. */
  side_a_cm: number | null
  side_b_cm: number | null
  /** For sets: each piece's own size (3 Seater, 2 Seater). */
  pieces: Piece[]
}

const EMPTY: Dimensions = { width_cm: null, depth_cm: null, height_cm: null, side_a_cm: null, side_b_cm: null, pieces: [] }

const NUM = '(\\d+(?:\\.\\d+)?)'

function first(re: RegExp, text: string): number | null {
  const m = re.exec(text)
  return m?.[1] ? Number(m[1]) : null
}

/** One piece's measurements: "L:198cm H:97cm D:94cm", "Length:169 | Width:94 | Height:94" or "192 cm". */
function parseSingle(segment: string): Omit<Piece, 'label'> {
  const seg = segment.replace(/\|/g, ' ')
  const hasLength = /\blength\s*:/i.test(seg)
  const width =
    first(new RegExp(`\\bL(?:ength)?\\s*:\\s*${NUM}`, 'i'), seg) ?? first(new RegExp(`^\\s*${NUM}\\s*(?:cm)?\\s*$`, 'i'), seg)
  const height = first(new RegExp(`\\bH(?:eight)?\\s*:\\s*${NUM}`, 'i'), seg)
  // Where "Length" is given, "Width" is front-to-back.
  const depth =
    first(new RegExp(`\\bD(?:epth)?\\s*:\\s*${NUM}`, 'i'), seg) ?? (hasLength ? first(new RegExp(`\\bWidth\\s*:\\s*${NUM}`, 'i'), seg) : null)
  return { width_cm: width, depth_cm: depth, height_cm: height }
}

/**
 * Free-text dimensions to numbers. Handles single pieces, two-piece sets
 * ("3 Seater: … | 2 Seater: …"), corners ("240cm x 240cm") and U-shapes
 * ("180cm x 300cm x 180cm", the middle figure being the back).
 */
export function parseDimensions(raw: string | null | undefined): Dimensions {
  const text = (raw ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return { ...EMPTY, pieces: [] }

  const labels = [...text.matchAll(/(\d)\s*-?\s*seater\s*:?/gi)]
  if (labels.length >= 2) {
    const pieces: Piece[] = labels.map((m, i) => {
      const start = (m.index ?? 0) + m[0].length
      const end = i + 1 < labels.length ? (labels[i + 1]?.index ?? text.length) : text.length
      return { label: `${m[1]} Seater`, ...parseSingle(text.slice(start, end)) }
    })
    const widest = pieces.reduce((a, b) => ((b.width_cm ?? 0) > (a.width_cm ?? 0) ? b : a))
    return { width_cm: widest.width_cm, depth_cm: widest.depth_cm, height_cm: widest.height_cm, side_a_cm: null, side_b_cm: null, pieces }
  }

  const plan = new RegExp(`${NUM}\\s*(?:cm)?\\s*x\\s*${NUM}\\s*(?:cm)?(?:\\s*x\\s*${NUM}\\s*(?:cm)?)?`, 'i').exec(text)
  const rest = plan ? text.replace(plan[0], ' ') : text
  const single = parseSingle(rest)

  if (plan) {
    const a = Number(plan[1])
    const b = Number(plan[2])
    if (plan[3]) {
      return { width_cm: b, depth_cm: single.depth_cm, height_cm: single.height_cm, side_a_cm: a, side_b_cm: Number(plan[3]), pieces: [] }
    }
    return { width_cm: Math.max(a, b), depth_cm: single.depth_cm, height_cm: single.height_cm, side_a_cm: a, side_b_cm: b, pieces: [] }
  }

  return { ...single, side_a_cm: null, side_b_cm: null, pieces: [] }
}

export type Shape = 'straight' | 'set' | 'corner' | 'u-shape' | 'armchair' | 'footstool'

/** The piece's shape and seat count, read from its size label or title. */
export function shapeAndSeats(label: string): { shape: Shape; seats: number | null } {
  const t = label.toLowerCase()
  if (/foot\s*stool/.test(t)) return { shape: 'footstool', seats: null }
  if (/arm\s*chair/.test(t)) return { shape: 'armchair', seats: 1 }
  if (/u[\s-]?shape/.test(t)) return { shape: 'u-shape', seats: null }
  const seats = /(\d)\s*seater/.exec(t)
  if (/corner|l[\s-]shape/.test(t)) return { shape: 'corner', seats: seats ? Number(seats[1]) : null }
  if (/3\s*\+\s*2|3\s*and\s*2/.test(t)) return { shape: 'set', seats: 5 }
  if (seats) return { shape: 'straight', seats: Number(seats[1]) }
  return { shape: 'straight', seats: null }
}

/** Light tidying only: the design names stay; the full title restyle is Phase 17C. */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b3\s*\+\s*2 seater\b/gi, '3+2 Seater')
    .replace(/\bu[\s-]shaped\b/gi, 'U-Shaped')
    .replace(/\barm chair\b/gi, 'Armchair')
}

/** URL slug: consistent spellings for sets and armchairs. */
export function cleanSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/3-?and-?2/g, '3-2')
    .replace(/arm-chair/g, 'armchair')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** "Ashton Sofa" -> "Ashton". The range name customers know, without the product word. */
export function rangeName(name: string): string {
  return name.replace(/\s+sofa$/i, '').trim()
}

function titleCaseWords(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, (c) => c.toUpperCase())
}

/** "#7d7d7d" -> "#7D7D7D"; null when it isn't a hex colour. */
export function cleanHex(hex: string | null | undefined): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim())
  return m?.[1] ? `#${m[1].toUpperCase()}` : null
}

/**
 * A colourway's name and swatch colour. An "R, G, B" triplet in place of a
 * name becomes the swatch colour; the name then has to come from an override.
 */
export function cleanColour(name: string | null, hex: string | null, override?: { name?: string; hex?: string }): { name: string | null; hex: string | null } {
  const raw = (name ?? '').trim()
  const rgb = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/.exec(raw)
  let outHex = cleanHex(hex)
  let outName: string | null = raw ? titleCaseWords(raw) : null
  if (rgb) {
    outHex = `#${[rgb[1], rgb[2], rgb[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`
    outName = null
  }
  return { name: override?.name ?? outName, hex: cleanHex(override?.hex) ?? outHex }
}

const TICK = /^(✓|yes|true|y)$/i

/** Free-form specification keys to Heartwell's typed fields (see the sofa product type). */
export function cleanSpecifications(specs: Record<string, unknown> | null | undefined): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  const text = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
  for (const [key, value] of Object.entries(specs ?? {})) {
    const k = key.trim().toLowerCase()
    const v = text(value)
    if (!v) continue
    switch (k) {
      case 'material':
        out.material = v
        break
      case 'feet':
        out.feet = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
        break
      case 'arms':
        out.arms = v
        break
      case 'back cushions':
        out.back_cushions = v
        break
      case 'seat cushions':
        out.seat_cushions = v
        break
      case 'all cushions included':
        if (TICK.test(v)) out.cushions_included = true
        break
      case 'deep buttoned arms':
        if (TICK.test(v)) out.deep_buttoned_arms = true
        break
      case 'usb ports':
      case 'usb port':
      case 'usp port':
        if (TICK.test(v)) out.usb_ports = true
        break
      case 'cup holders':
        if (TICK.test(v)) out.cup_holders = true
        break
      case 'storage space':
        if (TICK.test(v)) out.storage = true
        break
      case 'led lights':
        if (TICK.test(v)) out.led_lights = true
        break
      // Dimensions become columns; "Style" is the range's second axis; "Reclining" is set from the categories.
      default:
        break
    }
  }
  return out
}
