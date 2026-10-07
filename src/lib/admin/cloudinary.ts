// Photo and video uploads from the admin go straight from the phone to
// Heartwell's Cloudinary, signed here so the API secret never leaves the
// server. Without the key and secret, photos can still be picked from the
// library or pasted, and videos pasted as Cloudinary links.

import 'server-only'
import { cloudinarySignature } from './cloudinary-sign'

/** Heartwell's cloud (it appears in every image address, so it isn't secret). */
export const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'iv3tp2iq'
export const UPLOADS_CONFIGURED = Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
export const UPLOAD_FOLDER = 'heartwell/uploads'

export interface SignedUpload {
  url: string
  fields: Record<string, string>
}

const FORMATS = { image: 'jpg,jpeg,png,webp,avif,heic', video: 'mp4,mov,webm,m4v' } as const

/** One upload's signed fields, valid for an hour. Cloudinary names the file, so nothing is overwritten. */
export function signedUpload(resource: 'image' | 'video' = 'image', now = Date.now()): SignedUpload | null {
  const apiKey = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!apiKey || !secret) return null
  const params = {
    allowed_formats: FORMATS[resource],
    folder: UPLOAD_FOLDER,
    tags: 'heartwell-admin',
    timestamp: String(Math.floor(now / 1000)),
  }
  return {
    url: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resource}/upload`,
    fields: { ...params, api_key: apiKey, signature: cloudinarySignature(params, secret) },
  }
}
