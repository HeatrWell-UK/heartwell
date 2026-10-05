import 'server-only'
import { headers } from 'next/headers'

// A simple in-memory limiter. On Hostinger the shop runs as one long-lived
// process, so it's effective; on Vercel each instance keeps its own count,
// which still blunts a burst. Keys are hashed-free strings like "order:1.2.3.4".

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    return true
  }
  bucket.count++
  return bucket.count <= limit
}

/** The visitor's address as the proxy reports it, for rate limiting only (never stored or sent anywhere). */
export async function clientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}
