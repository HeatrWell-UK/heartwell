// The delivery areas form (Admin → Settings): the mainland areas that pay a
// delivery charge, and the days nothing is delivered. Pure, so it's tested;
// the database's own checks (delivery_areas) back every rule.

import { slugify } from '@/lib/catalogue/clean'

export interface AreaDraft {
  /** Empty for a new area: made from the name. */
  slug: string
  name: string
  places: string
  charge: string
  minDays: string
  maxDays: string
  /** Outward codes, separated by commas, spaces or new lines. */
  districts: string
}

export interface AreaRow {
  slug: string
  name: string
  places: string
  charge: number
  min_working_days: number
  max_working_days: number
  districts: string[]
}

export function areaDraft(a: AreaRow): AreaDraft {
  return {
    slug: a.slug,
    name: a.name,
    places: a.places,
    charge: String(a.charge),
    minDays: String(a.min_working_days),
    maxDays: String(a.max_working_days),
    districts: a.districts.join(', '),
  }
}

export const EMPTY_AREA: AreaDraft = { slug: '', name: '', places: '', charge: '', minDays: '5', maxDays: '7', districts: '' }

const DISTRICT = /^[A-Z]{1,2}[0-9][0-9A-Z]?$/

/** "ex1, EX2\n tq3" -> the codes, in capitals, once each, and anything that isn't a district. */
export function parseDistricts(text: string): { districts: string[]; bad: string[] } {
  const parts = text
    .toUpperCase()
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const districts = [...new Set(parts.filter((p) => DISTRICT.test(p)))]
  const bad = [...new Set(parts.filter((p) => !DISTRICT.test(p)))]
  return { districts, bad }
}

const whole = (v: string) => (/^\d{1,3}$/.test(v.trim()) ? Number(v.trim()) : null)

export function checkArea(d: AreaDraft): { problems: string[]; row: AreaRow | null } {
  const problems: string[] = []
  const name = d.name.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 60) problems.push('Give the area a name, up to 60 characters.')
  const slug = d.slug || slugify(name)
  if (!slug) problems.push('Give the area a name with some letters in it.')
  const charge = /^\d{1,4}(\.\d{1,2})?$/.test(d.charge.trim()) ? Number(d.charge.trim()) : null
  if (charge === null || charge > 1000) problems.push('The charge is a number of pounds, up to £1,000.')
  const min = whole(d.minDays)
  const max = whole(d.maxDays)
  if (min === null || min > 60) problems.push('The quickest delivery is a number of working days, up to 60.')
  if (max === null || max > 90) problems.push('The slowest delivery is a number of working days, up to 90.')
  if (min !== null && max !== null && max < min) problems.push('The slowest delivery can’t be quicker than the quickest.')
  const { districts, bad } = parseDistricts(d.districts)
  if (bad.length) problems.push(`These aren’t postcode districts: ${bad.slice(0, 5).join(', ')}. Use the first half of a postcode, like EX4 or IV2.`)
  if (districts.length === 0) problems.push('List at least one postcode district, like EX4.')
  const places = d.places.trim().replace(/\s+/g, ' ').slice(0, 200)
  if (problems.length) return { problems, row: null }
  return { problems, row: { slug, name, places, charge: charge!, min_working_days: min!, max_working_days: max!, districts } }
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

/** ISO days (1 = Monday), checked: at least one day must still have deliveries. */
export function checkNoDeliveryDays(days: unknown): number[] | null {
  if (!Array.isArray(days)) return null
  const clean = [...new Set(days.map(Number))].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort()
  return clean.length < 7 ? clean : null
}
