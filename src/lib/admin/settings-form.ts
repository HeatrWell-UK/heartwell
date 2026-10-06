// The shop settings the owner can change (public.shop_settings): delivery
// extras, the delivery and preferred-day windows, the offer amounts and the
// sample limit. Pure: field definitions, checks and the row to store. The
// database's own checks back every rule here.

export type SettingKey =
  | 'upstairs_first_floor'
  | 'upstairs_per_extra_floor'
  | 'max_floor'
  | 'assembly_fee'
  | 'removal_per_seat'
  | 'removal_min_seats'
  | 'removal_default_seats'
  | 'removal_max_seats'
  | 'delivery_min_working_days'
  | 'delivery_max_working_days'
  | 'preferred_date_min_days'
  | 'preferred_date_max_days'
  | 'offer_tier_high'
  | 'offer_tier_mid'
  | 'offer_tier_standard'
  | 'paid_offer_days'
  | 'sample_limit'

export interface SettingField {
  key: SettingKey
  label: string
  hint?: string
  kind: 'money' | 'whole'
  min: number
  max: number
}

export const SETTING_GROUPS: { title: string; intro: string; fields: SettingField[] }[] = [
  {
    title: 'Delivery extras',
    intro: 'What the driver’s extra work costs. Delivery itself stays free on the UK mainland.',
    fields: [
      { key: 'upstairs_first_floor', label: 'Carrying to the 1st floor', kind: 'money', min: 0, max: 1000 },
      { key: 'upstairs_per_extra_floor', label: 'Each floor above that', kind: 'money', min: 0, max: 1000 },
      { key: 'max_floor', label: 'Highest floor we carry to', hint: 'The floor list at checkout stops here.', kind: 'whole', min: 1, max: 50 },
      { key: 'assembly_fee', label: 'Assembly in the room', kind: 'money', min: 0, max: 1000 },
      { key: 'removal_per_seat', label: 'Taking the old one away, per seat', kind: 'money', min: 0, max: 1000 },
      { key: 'removal_min_seats', label: 'Fewest seats to take away', kind: 'whole', min: 1, max: 20 },
      { key: 'removal_default_seats', label: 'Seats suggested at checkout', kind: 'whole', min: 1, max: 20 },
      { key: 'removal_max_seats', label: 'Most seats to take away', kind: 'whole', min: 1, max: 20 },
    ],
  },
  {
    title: 'Delivery dates',
    intro: 'The window customers are promised, counted in working days from the order, and how far ahead they may pick a day.',
    fields: [
      { key: 'delivery_min_working_days', label: 'Delivery window starts after', hint: 'Working days.', kind: 'whole', min: 0, max: 60 },
      { key: 'delivery_max_working_days', label: 'Delivery window ends after', hint: 'Working days.', kind: 'whole', min: 0, max: 90 },
      { key: 'preferred_date_min_days', label: 'Earliest day they can choose', hint: 'Days from today.', kind: 'whole', min: 0, max: 60 },
      { key: 'preferred_date_max_days', label: 'Latest day they can choose', hint: 'Days from today.', kind: 'whole', min: 1, max: 365 },
    ],
  },
  {
    title: 'Offer amounts',
    intro: 'Pounds off when a customer has a live offer code or arrived from an offer ad. The order’s best tier decides the amount; set each product’s tier on its page.',
    fields: [
      { key: 'offer_tier_high', label: 'High tier', kind: 'money', min: 0, max: 5000 },
      { key: 'offer_tier_mid', label: 'Mid tier', kind: 'money', min: 0, max: 5000 },
      { key: 'offer_tier_standard', label: 'Standard tier', kind: 'money', min: 0, max: 5000 },
      { key: 'paid_offer_days', label: 'An ad offer lasts', hint: 'Days after they arrive.', kind: 'whole', min: 1, max: 60 },
    ],
  },
  {
    title: 'Samples',
    intro: 'Used when fabric samples go live.',
    fields: [{ key: 'sample_limit', label: 'Samples per request', kind: 'whole', min: 1, max: 20 }],
  },
]

export const SETTING_FIELDS: SettingField[] = SETTING_GROUPS.flatMap((g) => g.fields)

export type SettingsDraft = Record<SettingKey, string>
export type SettingsRow = Record<SettingKey, number>

export function settingsDraft(row: Partial<Record<SettingKey, number | string | null>>): SettingsDraft {
  return Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, row[f.key] === null || row[f.key] === undefined ? '' : String(row[f.key])])) as SettingsDraft
}

const MONEY = /^\d{1,5}(\.\d{1,2})?$/
const WHOLE = /^\d{1,4}$/

export function checkSettings(d: SettingsDraft): { problems: string[]; row: SettingsRow | null } {
  const problems: string[] = []
  const row = {} as SettingsRow
  for (const f of SETTING_FIELDS) {
    const raw = (d[f.key] ?? '').trim()
    const ok = f.kind === 'money' ? MONEY.test(raw) : WHOLE.test(raw)
    const n = Number(raw)
    if (!ok) problems.push(`${f.label}: enter ${f.kind === 'money' ? 'an amount in pounds' : 'a whole number'}.`)
    else if (n < f.min || n > f.max) problems.push(`${f.label}: between ${f.min} and ${f.max}.`)
    else row[f.key] = n
  }
  if (problems.length) return { problems, row: null }
  if (row.delivery_min_working_days > row.delivery_max_working_days) problems.push('The delivery window can’t end before it starts.')
  if (row.preferred_date_min_days > row.preferred_date_max_days) problems.push('The latest day to choose must be after the earliest.')
  if (!(row.removal_min_seats <= row.removal_default_seats && row.removal_default_seats <= row.removal_max_seats)) {
    problems.push('Seats to take away: the suggested number must sit between the fewest and the most.')
  }
  if (!(row.offer_tier_high >= row.offer_tier_mid && row.offer_tier_mid >= row.offer_tier_standard)) {
    problems.push('Offer amounts: high should be at least mid, and mid at least standard.')
  }
  return problems.length ? { problems, row: null } : { problems, row }
}

/** Offer codes are stored upper case, 4 to 24 letters and numbers (the database checks the same). */
export function cleanOfferCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '')
  return /^[A-Z0-9]{4,24}$/.test(code) ? code : null
}
