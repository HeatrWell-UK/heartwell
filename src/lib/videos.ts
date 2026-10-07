// Product videos live in Cloudinary. A phone's original (often an iPhone .mov)
// won't play everywhere, so pages ask Cloudinary for an MP4 at automatic
// quality (made once, then cached), with the first frame as the poster.

const VIDEO_URL = /^https:\/\/res\.cloudinary\.com\/([^/\s]+)\/video\/upload\/(\S+)$/
/** A transformation segment, e.g. q_auto or q_auto,f_auto. */
const TRANSFORMATION = /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*$/

export interface CloudinaryVideo {
  cloud: string
  /** e.g. heartwell/uploads/abc123 */
  publicId: string
  mp4: string
  poster: string
}

/** Null for anything that isn't a Cloudinary video link. */
export function cloudinaryVideo(url: string): CloudinaryVideo | null {
  const m = VIDEO_URL.exec(url.trim())
  if (!m) return null
  const [, cloud, rest] = m as unknown as [string, string, string]
  let parts = rest.split('/')
  const version = parts.findIndex((s) => /^v\d+$/.test(s))
  if (version >= 0) parts = parts.slice(version + 1)
  else while (parts.length > 1 && TRANSFORMATION.test(parts[0]!)) parts.shift()
  const publicId = parts.join('/').replace(/\.[a-z0-9]{2,5}$/i, '')
  if (!publicId) return null
  const base = `https://res.cloudinary.com/${cloud}/video/upload`
  return { cloud, publicId, mp4: `${base}/q_auto/${publicId}.mp4`, poster: `${base}/so_0,q_auto/${publicId}.jpg` }
}

export const VIDEO_KINDS = [
  { value: 'customer', label: 'From a customer' },
  { value: 'studio', label: 'Our own' },
  { value: 'warehouse', label: 'From the warehouse' },
] as const
export type VideoKind = (typeof VIDEO_KINDS)[number]['value']
