// Cloudinary's upload signature: every signed parameter as name=value, sorted
// by name, joined with &, the API secret appended, then SHA-1. (file,
// cloud_name, resource_type and api_key are never signed.) Pure, for tests.

import { createHash } from 'node:crypto'

export function cloudinarySignature(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => !['file', 'cloud_name', 'resource_type', 'api_key'].includes(k))
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(toSign + apiSecret).digest('hex')
}
