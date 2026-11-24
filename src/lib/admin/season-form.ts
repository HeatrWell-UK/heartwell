// The season settings form (Admin → Settings → Christmas and New Year season):
// UK-time inputs to the database's instants, and the checks the database also makes.

export interface SeasonStatus {
  enabled: boolean
  starts_at: string
  ends_at: string
  amount: number
  window_hours: number
  generation: string
  live_now: boolean
  windows_this_generation: number
  windows_live: number
  windows_ended: number
  archived: number
  eligible_products: number
  excluded_products: string[]
}

export interface SeasonDraft {
  enabled: boolean
  /** UK wall-clock time, "YYYY-MM-DDTHH:mm" (a datetime-local input). */
  startsLocal: string
  endsLocal: string
  windowDays: string
  newGeneration: boolean
}

const LONDON = 'Europe/London'

/** Minutes London is ahead of UTC at this instant (0 in winter, 60 in summer). */
function londonOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: LONDON, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUtc - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000)
}

/** "2027-02-01T00:00" in UK time → ISO instant, or null when it isn't a date and time. */
export function londonLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim())
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number]
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  if (!Number.isFinite(guess)) return null
  const first = guess - londonOffsetMinutes(new Date(guess)) * 60_000
  const exact = guess - londonOffsetMinutes(new Date(first)) * 60_000
  return new Date(exact).toISOString()
}

/** ISO instant → "YYYY-MM-DDTHH:mm" in UK time, for the input. */
export function isoToLondonLocal(iso: string): string {
  const at = new Date(iso)
  if (!Number.isFinite(at.getTime())) return ''
  const local = new Date(at.getTime() + londonOffsetMinutes(at) * 60_000)
  return local.toISOString().slice(0, 16)
}

export function seasonDraft(s: SeasonStatus): SeasonDraft {
  return { enabled: s.enabled, startsLocal: isoToLondonLocal(s.starts_at), endsLocal: isoToLondonLocal(s.ends_at), windowDays: String(Math.round((s.window_hours / 24) * 100) / 100), newGeneration: false }
}

export function checkSeason(d: SeasonDraft): { problems: string[]; input: { enabled: boolean; starts_at: string; ends_at: string; window_hours: number; new_generation: boolean } | null } {
  const problems: string[] = []
  const starts = londonLocalToIso(d.startsLocal)
  const ends = londonLocalToIso(d.endsLocal)
  const days = Number(d.windowDays)
  if (!starts) problems.push('Give the start as a date and time.')
  if (!ends) problems.push('Give the end as a date and time.')
  if (starts && ends && Date.parse(ends) <= Date.parse(starts)) problems.push('The end must be after the start.')
  if (!(days > 0) || days > 90) problems.push('Each visitor’s window is between 1 hour and 90 days.')
  const hours = Math.round(days * 24)
  if (problems.length || !starts || !ends || hours < 1) return { problems: problems.length ? problems : ['Each visitor’s window is at least 1 hour.'], input: null }
  return { problems: [], input: { enabled: d.enabled, starts_at: starts, ends_at: ends, window_hours: hours, new_generation: d.newGeneration } }
}
