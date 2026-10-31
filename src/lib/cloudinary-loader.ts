// next/image loader. Product photos live in Heartwell's Cloudinary, which
// resizes and converts them (AVIF/WebP) at the edge, so the web server never
// processes images. That keeps pages fast and the hosting portable.
//
// Rules:
// - Only plain `/image/upload/<version>/<public id>` URLs get a size added.
//   A URL that already carries a transformation is returned as it is: adding a
//   second, different chain in front of a generative effect would make
//   Cloudinary generate it again (and charge for it).
// - The one exception is a close-up (src/lib/product/close-ups.ts): a plain
//   photo with only a crop in front. It's sized after the crop, never wider
//   than the square itself, so the larger sizes share one cached file.
// - Local files (/brand/..., /icons/...) are returned unchanged.

const CLOUDINARY_UPLOAD = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//
const CROP_ONLY = /^c_crop,x_\d+,y_\d+,w_(\d+),h_\d+$/

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!CLOUDINARY_UPLOAD.test(src)) return src
  const rest = src.replace(CLOUDINARY_UPLOAD, '')
  const [firstSegment = '', secondSegment = ''] = rest.split('/')
  const params = (w: number) => ['f_auto', 'c_limit', `w_${w}`, `q_${quality ?? 'auto'}`].join(',')
  const isPlain = /^v\d+$/.test(firstSegment) || !/[_:,]/.test(firstSegment)
  if (isPlain) return src.replace(CLOUDINARY_UPLOAD, (m) => `${m}${params(width)}/`)
  const crop = CROP_ONLY.exec(firstSegment)
  if (crop && /^v\d+$/.test(secondSegment)) return src.replace(`/${firstSegment}/`, `/${firstSegment}/${params(Math.min(width, Number(crop[1])))}/`)
  return src
}
