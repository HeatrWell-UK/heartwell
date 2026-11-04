export const RANGE_COPY: Record<string, { intro: string; highlights: string[] }>

export interface DescribedPiece {
  copyKey: string
  width_cm: number | null
  depth_cm: number | null
  height_cm: number | null
  side_a_cm: number | null
  side_b_cm: number | null
  made_to_order: boolean
}

export function describeProduct(p: DescribedPiece, colours: string[]): { description: string | null; highlights: string[] }
