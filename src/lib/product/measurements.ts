// Which top-view drawing a product gets, from its shape and measurements.

import type { Piece } from '@/lib/catalogue/clean'
import type { SizeFields } from '@/lib/catalogue/display'

export type Layout =
  | { kind: 'straight'; w: number; d: number | null }
  | { kind: 'corner'; top: number; left: number; d: number | null }
  | { kind: 'u'; back: number; left: number; right: number; d: number | null }
  | { kind: 'set'; pieces: { label: string; w: number; d: number | null }[] }

export function measurementLayout(shape: string | null, dims: SizeFields, pieces: Piece[]): Layout | null {
  const { width_cm: w, depth_cm: d, side_a_cm: a, side_b_cm: b } = dims
  if (a && b && w && w > Math.max(a, b)) return { kind: 'u', back: w, left: a, right: b, d }
  if (a && b) return { kind: 'corner', top: Math.max(a, b), left: Math.min(a, b), d }
  const sized = pieces.filter((p): p is Piece & { width_cm: number } => typeof p.width_cm === 'number')
  if (shape === 'set' && sized.length >= 2) return { kind: 'set', pieces: sized.slice(0, 2).map((p) => ({ label: p.label, w: p.width_cm, d: p.depth_cm })) }
  if (w) return { kind: 'straight', w, d }
  return null
}
