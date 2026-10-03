/* eslint-disable @next/next/no-img-element -- tiny pre-sized local files: next/image would add a srcset of the same file and nothing else */
import { cn } from '@/lib/cn'

/**
 * Heartwell's logo (the owner's original heart-backed sofa, recoloured).
 * Small WebP renders for speed; the SVG originals in /public/brand are for
 * large uses. Sizes keep each file's aspect ratio (mark 670:475, wordmark 1150:215).
 */

/** Mark + wordmark side by side: header (light) and footer (reversed). */
export function LogoLockup({ reversed = false, height = 31, className }: { reversed?: boolean; height?: number; className?: string }) {
  const markWidth = Math.round((height * 670) / 475)
  const wordHeight = Math.round(height * 0.77)
  const wordWidth = Math.round((wordHeight * 1150) / 215)
  const suffix = reversed ? '-reversed' : ''
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img src={`/brand/hw-mark${suffix}.webp`} alt="" width={markWidth} height={height} className="block" />
      <img src={`/brand/hw-wordmark${suffix}.webp`} alt="Heartwell" width={wordWidth} height={wordHeight} className="block" />
    </span>
  )
}

/** The full stacked logo with "SOFA": footer on the home page, brand moments. */
export function LogoStacked({ reversed = false, width = 190, className }: { reversed?: boolean; width?: number; className?: string }) {
  const height = Math.round((width * 790) / 1150)
  return (
    <img
      src={`/brand/hw-logo${reversed ? '-reversed' : ''}.webp`}
      alt="Heartwell Sofa"
      width={width}
      height={height}
      className={cn('block', className)}
    />
  )
}
