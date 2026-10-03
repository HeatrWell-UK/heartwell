// next/image loader. Product photos live in Heartwell's Cloudinary, which
// resizes and converts them (AVIF/WebP) at the edge, so the web server never
// processes images. That keeps pages fast and the hosting portable.
//
// Rules:
// - Only plain `/image/upload/<version>/<public id>` URLs get a size added.
//   A URL that already carries a transformation is returned as it is: adding a
//   second, different chain in front of a generative effect would make
//   Cloudinary generate it again (and charge for it).
// - Local files (/brand/..., /icons/...) are returned unchanged.

const CLOUDINARY_UPLOAD = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!CLOUDINARY_UPLOAD.test(src)) return src
  const rest = src.replace(CLOUDINARY_UPLOAD, '')
  const firstSegment = rest.split('/')[0] ?? ''
  const isPlain = /^v\d+$/.test(firstSegment) || !/[_:,]/.test(firstSegment)
  if (!isPlain) return src
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality ?? 'auto'}`].join(',')
  return src.replace(CLOUDINARY_UPLOAD, (m) => `${m}${params}/`)
}
