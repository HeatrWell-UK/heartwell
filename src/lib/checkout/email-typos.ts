// "Did you mean …@gmail.com?" under the email field at checkout (10 November
// 2026): a mistyped address means the confirm link never arrives. Only a
// suggestion; the customer decides.

/** Addresses people in the UK use most, plus look-alikes that are real (so they're never "corrected"). */
const KNOWN = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'live.co.uk',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aol.co.uk',
  'btinternet.com',
  'bt.com',
  'sky.com',
  'virginmedia.com',
  'talktalk.net',
  'ntlworld.com',
  'mail.com',
  'gmx.com',
  'gmx.co.uk',
  'proton.me',
  'protonmail.com',
]

/** Mistakes too far from the right answer for the spelling check below. */
const MISTAKES: Record<string, string> = {
  'gmail.co.uk': 'gmail.com',
  'googlemail.co.uk': 'googlemail.com',
  'icloud.co.uk': 'icloud.com',
}

/** Letters to add, drop or change to turn one word into the other. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const kept = row[j]!
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = kept
    }
  }
  return row[b.length]!
}

/** The address with its domain corrected, when it looks like a slip of the finger; otherwise null. */
export function emailSuggestion(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (!domain || KNOWN.includes(domain)) return null
  if (MISTAKES[domain]) return `${local}@${MISTAKES[domain]}`
  // Short domains are only one slip away from each other (bt.com, me.com), so they need a closer match.
  const allowed = domain.length >= 8 ? 2 : 1
  let best: string | null = null
  let bestDistance = allowed + 1
  for (const known of KNOWN) {
    const d = distance(domain, known)
    if (d < bestDistance) {
      best = known
      bestDistance = d
    }
  }
  return best ? `${local}@${best}` : null
}
