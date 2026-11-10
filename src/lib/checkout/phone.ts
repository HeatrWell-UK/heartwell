// UK phone numbers as customers type them: "07460 669864", "+44 7460 669864",
// "(0)7460-669864". Pure functions, shared by checkout and the emails.
//
// Strict about length (10 November 2026): an order came in with a mobile one
// digit short (10 digits), which the old check let through because a few
// landlines have 10. Mobiles must now have exactly 11 digits.

/** The number without +44, 0044, 44 or its leading 0: what's left to check. */
function nationalDigits(raw: string): string {
  let d = raw.replace(/\(0\)/g, '').replace(/[^0-9+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('44')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  return d
}

/**
 * After the leading 0: a mobile is 7 and nine more digits (07700 900123); a
 * landline is 01 with nine or ten more (a few old ones have the shorter form),
 * or 02 or 03 with ten.
 */
const NATIONAL = /^(?:7\d{9}|1\d{8,9}|[23]\d{9})$/

/** International digits without "+", for wa.me links, or null when it isn't a UK number. */
export function ukPhoneDigits(raw: string): string | null {
  const d = nationalDigits(raw)
  return NATIONAL.test(d) ? `44${d}` : null
}

export const isUkPhone = (raw: string) => ukPhoneDigits(raw) !== null

/** "07460 669864" style, for display and the order record. Mobiles get a space after five digits. */
export function formatUkPhone(raw: string): string {
  const d = ukPhoneDigits(raw)
  if (!d) return raw.trim()
  const national = `0${d.slice(2)}`
  return national.startsWith('07') ? `${national.slice(0, 5)} ${national.slice(5)}` : `${national.slice(0, 4)} ${national.slice(4)}`
}

/** What's wrong with a number, in words a customer can act on, or null when it's fine. */
export function phoneProblem(raw: string): string | null {
  if (!raw.trim()) return 'Please enter your mobile number, so we can ring you to book delivery.'
  if (isUkPhone(raw)) return null
  const d = nationalDigits(raw)
  if (d.startsWith('7')) {
    const count = d.length + 1
    return `UK mobile numbers have 11 digits, starting 07. This one has ${count}${count < 11 ? ', so a digit is missing' : ''}. Please check it.`
  }
  return 'Please enter a UK phone number, like 07700 900123.'
}
