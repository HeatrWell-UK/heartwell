// Plain-language summaries of catalogue rows, shared by the admin and the shop.

export interface SizeFields {
  width_cm: number | null
  depth_cm: number | null
  height_cm: number | null
  side_a_cm: number | null
  side_b_cm: number | null
}

const cm = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * "W 198 · D 94 · H 97 cm" for a straight piece, "240 × 240 cm · D 95 · H 90 cm"
 * for a corner and "180 × 300 × 180 cm · …" for a U-shape (back in the middle).
 * Null when nothing is known.
 */
export function dimensionSummary(p: SizeFields): string | null {
  const { width_cm: w, depth_cm: d, height_cm: h, side_a_cm: a, side_b_cm: b } = p
  const rest = [d ? `D ${cm(d)}` : null, h ? `H ${cm(h)}` : null].filter((x): x is string => x !== null)
  if (a && b) {
    const plan = w && w > Math.max(a, b) ? [a, w, b] : [a, b]
    return [`${plan.map(cm).join(' × ')} cm`, rest.length ? `${rest.join(' · ')} cm` : null].filter(Boolean).join(' · ')
  }
  const parts = [w ? `W ${cm(w)}` : null, ...rest].filter((x): x is string => x !== null)
  return parts.length ? `${parts.join(' · ')} cm` : null
}

export type CatalogueIssue = 'no-colourways' | 'no-photo' | 'unnamed-colour' | 'no-dimensions'

export const ISSUE_LABEL: Record<CatalogueIssue, string> = {
  'no-colourways': 'No colourways',
  'no-photo': 'No photo',
  'unnamed-colour': 'Colour without a name',
  'no-dimensions': 'No dimensions',
}

export interface IssueFields extends SizeFields {
  gallery_images: string[]
  variants: { image_url: string | null; colour_name: string | null; is_active: boolean }[]
}

/** What a shopper would miss on this product's page. */
export function catalogueIssues(p: IssueFields): CatalogueIssue[] {
  const shown = p.variants.filter((v) => v.is_active)
  const issues: CatalogueIssue[] = []
  if (shown.length === 0) issues.push('no-colourways')
  if (p.gallery_images.length === 0 && !shown.some((v) => v.image_url)) issues.push('no-photo')
  if (shown.some((v) => !v.colour_name)) issues.push('unnamed-colour')
  if (!p.width_cm && !p.side_a_cm) issues.push('no-dimensions')
  return issues
}
