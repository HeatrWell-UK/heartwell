import 'server-only'
import { normalisePostcode } from '@/lib/delivery/postcode'

// Addresses at a postcode, from whichever provider the shop signs up to.
// The key stays on the server (ADDRESS_LOOKUP_KEY), never in the browser.
// Without a provider the checkout simply asks for the address to be typed.

export type LookupProvider = 'homedata' | 'ideal-postcodes' | 'getaddress'

const PROVIDER = (process.env.ADDRESS_LOOKUP_PROVIDER ?? '').trim().toLowerCase() as LookupProvider | ''
const KEY = (process.env.ADDRESS_LOOKUP_KEY ?? '').trim()

export const ADDRESS_LOOKUP_CONFIGURED = KEY !== '' && ['homedata', 'ideal-postcodes', 'getaddress'].includes(PROVIDER)

export class LookupError extends Error {
  constructor(
    message: string,
    public readonly kind: 'not_found' | 'unavailable',
  ) {
    super(message)
  }
}

const tidy = (parts: (string | null | undefined)[]) =>
  parts
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ')

/** One line per address, without the postcode (it's kept separately). */
export async function findAddresses(rawPostcode: string): Promise<string[]> {
  if (!ADDRESS_LOOKUP_CONFIGURED) throw new LookupError('Address lookup is not set up', 'unavailable')
  const postcode = normalisePostcode(rawPostcode)
  const compact = postcode.replace(/\s/g, '')
  const signal = AbortSignal.timeout(6000)
  let res: Response
  try {
    if (PROVIDER === 'homedata') {
      res = await fetch(`https://api.homedata.co.uk/api/address/find/?q=${encodeURIComponent(postcode)}`, {
        headers: { Authorization: `Api-Key ${KEY}` },
        signal,
      })
    } else if (PROVIDER === 'ideal-postcodes') {
      res = await fetch(`https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(compact)}?api_key=${encodeURIComponent(KEY)}`, { signal })
    } else {
      res = await fetch(`https://api.getAddress.io/find/${encodeURIComponent(compact)}?api-key=${encodeURIComponent(KEY)}&expand=true`, { signal })
    }
  } catch {
    throw new LookupError('Address lookup did not answer', 'unavailable')
  }
  if (res.status === 404) throw new LookupError('Postcode not found', 'not_found')
  if (!res.ok) throw new LookupError(`Address lookup answered ${res.status}`, 'unavailable')

  const data = (await res.json()) as Record<string, unknown>
  let lines: string[] = []
  if (PROVIDER === 'homedata') {
    const list = (data.suggestions ?? data.results ?? []) as { address?: string; full_address?: string }[]
    lines = list.map((i) => i.address ?? i.full_address ?? '').map((l) => l.replace(new RegExp(`,?\\s*${postcode}\\s*$`, 'i'), ''))
  } else if (PROVIDER === 'ideal-postcodes') {
    const list = (data.result ?? []) as { line_1?: string; line_2?: string; line_3?: string; post_town?: string }[]
    lines = list.map((a) => tidy([a.line_1, a.line_2, a.line_3, a.post_town]))
  } else {
    const list = (data.addresses ?? []) as { line_1?: string; line_2?: string; line_3?: string; town_or_city?: string }[]
    lines = list.map((a) => tidy([a.line_1, a.line_2, a.line_3, a.town_or_city]))
  }
  lines = [...new Set(lines.map((l) => l.trim()).filter(Boolean))]
  if (lines.length === 0) throw new LookupError('No addresses at that postcode', 'not_found')
  return lines
}
