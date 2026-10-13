/* eslint-disable @next/next/no-img-element -- tiny pre-sized local files: next/image would add a srcset of the same file and nothing else */
import { cn } from '@/lib/cn'

/**
 * Heartwell's logo (the owner's original heart-backed sofa, recoloured).
 * Small WebP renders for speed; the SVG originals in /public/brand are for
 * large uses. Sizes keep each file's aspect ratio (mark 670:475, wordmark 1150:215).
 */

/** 1x, 2x and 3x renders made for each use (scripts/build-brand-assets.mjs), so phones fetch only what they need. */
const densities = (name: string, base: number) => ({
  src: `/brand/${name}-${base}.webp`,
  srcSet: [1, 2, 3].map((x) => `/brand/${name}-${base * x}.webp ${x}x`).join(', '),
})

/** Mark + wordmark side by side: header (light) and footer (reversed). */
export function LogoLockup({ reversed = false, height = 31, className }: { reversed?: boolean; height?: number; className?: string }) {
  const markWidth = Math.round((height * 670) / 475)
  const wordHeight = Math.round(height * 0.77)
  const wordWidth = Math.round((wordHeight * 1150) / 215)
  const suffix = reversed ? '-reversed' : ''
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img {...densities(`hw-mark${suffix}`, 44)} alt="" width={markWidth} height={height} className="block" />
      <img {...densities(`hw-wordmark${suffix}`, 128)} alt="Heartwell" width={wordWidth} height={wordHeight} className="block" />
    </span>
  )
}

/**
 * The full stacked logo with "SOFA": footer on the home page, brand moments.
 * Lazy by default because it usually sits below the fold, which also stops the
 * page preloading it ahead of the hero photo.
 */
export function LogoStacked({
  reversed = false,
  width = 190,
  eager = false,
  className,
}: {
  reversed?: boolean
  width?: number
  eager?: boolean
  className?: string
}) {
  const height = Math.round((width * 790) / 1150)
  return (
    <img
      {...densities(`hw-logo${reversed ? '-reversed' : ''}`, 190)}
      alt="Heartwell Sofa"
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('block', className)}
    />
  )
}
