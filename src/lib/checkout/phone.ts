// UK phone numbers as customers type them: "07848 477056", "+44 7848 477056",
// "(0)7848-477056". Pure functions, shared by checkout and the emails.

/** International digits without "+", for wa.me links, or null when it isn't a UK number. */
export function ukPhoneDigits(raw: string): string | null {
  let d = raw.replace(/\(0\)/g, '').replace(/[^0-9+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('44')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (!/^[1-9]\d{8,9}$/.test(d)) return null
  return `44${d}`
}

export const isUkPhone = (raw: string) => ukPhoneDigits(raw) !== null

/** "07848 477056" style, for display and the order record. Mobiles get a space after five digits. */
export function formatUkPhone(raw: string): string {
  const d = ukPhoneDigits(raw)
  if (!d) return raw.trim()
  const national = `0${d.slice(2)}`
  return national.startsWith('07') ? `${national.slice(0, 5)} ${national.slice(5)}` : `${national.slice(0, 4)} ${national.slice(4)}`
}
