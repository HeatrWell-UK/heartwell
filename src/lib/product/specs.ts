// The Specifications panel: a product's typed fields, labelled by its product
// type (so a future coffee table shows its own fields), in plain words.

import type { SpecRow } from './types'

export interface SpecField {
  key: string
  label: string
  kind: 'text' | 'number' | 'boolean' | 'pieces' | string
}

const SHAPE_LABEL: Record<string, string> = {
  straight: 'Straight sofa',
  set: 'Sofa set (two pieces)',
  corner: 'Corner sofa',
  'u-shape': 'U-shaped sofa',
  armchair: 'Armchair',
  footstool: 'Footstool',
}

export function specRows(
  fields: SpecField[],
  specs: Record<string, unknown>,
  extras: { madeToOrder: boolean; madeInUk: boolean },
): SpecRow[] {
  const rows: SpecRow[] = []
  for (const field of fields) {
    const value = specs[field.key]
    if (value === undefined || value === null || value === '' || field.kind === 'pieces') continue
    if (field.kind === 'boolean') {
      if (value === true) rows.push({ label: field.label, value: 'Yes' })
    } else if (field.key === 'shape') {
      rows.push({ label: field.label, value: SHAPE_LABEL[String(value)] ?? String(value) })
    } else if (typeof value === 'string' || typeof value === 'number') {
      rows.push({ label: field.label, value: String(value) })
    }
  }
  if (extras.madeToOrder) rows.push({ label: 'Made to order', value: 'Yes, in the colour shown or any of our fabrics' })
  if (extras.madeInUk) rows.push({ label: 'Made in', value: 'The UK' })
  return rows
}
