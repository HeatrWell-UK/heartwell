// The visitor's own address, from x-forwarded-for, read from the right.
//
// Each proxy in front of the app adds the address it received the request
// from, so the entries a visitor can't fake are the last ones. Anything to the
// left of the visitor's entry is whatever their browser sent, so it's never
// trusted. TRUSTED_PROXIES is how many proxies add an entry after the
// visitor's; 0 on both hosts (measured with /api/health?ip=, 15 October 2026):
//   Vercel     replaces the header with the visitor's address.
//   Hostinger  the visitor's address is the last entry (x-real-ip matches
//              it); a made-up header only adds entries in front of it.
// Set it only if a host ever puts its own proxies after the visitor.
// Used for rate limits and the IP sent with Meta's server events.

export const TRUSTED_PROXIES = Math.max(0, Math.floor(Number(process.env.TRUSTED_PROXIES ?? 0)) || 0)

export function visitorAddress(forwardedFor: string | null, realIp: string | null, trusted = TRUSTED_PROXIES): string {
  const hops = (forwardedFor ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // Shorter than expected: the setting doesn't match this host, so use the
  // nearest entry rather than none.
  return hops.at(-1 - trusted) ?? hops[0] ?? (realIp?.trim() || 'unknown')
}
