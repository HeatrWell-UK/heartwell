import { useId } from 'react'
import { cn } from '@/lib/cn'
import { CONTACT } from '@/config/contact'
import { BRITAIN } from '@/components/home/britain-outline'

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`
const [, , MAP_W, MAP_H] = BRITAIN.viewBox.split(' ').map(Number) as [number, number, number, number]

/** A heart, like the logo's, centred on 0,0. */
const HEART = 'M0 -2.6C-1.6 -6.4 -7.6 -6.2 -7.6 -1.4C-7.6 2.6 -2.4 5.6 0 7.6C2.4 5.6 7.6 2.6 7.6 -1.4C7.6 -6.2 1.6 -6.4 0 -2.6Z'

/**
 * Mainland Britain (where delivery is free) with the showroom marked by a gold
 * heart: on the home page, Visit us and Delivery and returns. The same area
 * the checkout calls UK Mainland (src/lib/delivery/postcode.ts).
 */
export function BritainMap({
  className,
  caption,
  showroom = true,
}: {
  className?: string
  caption?: string
  /** Mark the showroom (a heart and its name); off where the map only shows the delivery area. */
  showroom?: boolean
}) {
  const a = showroom ? CONTACT.visitAddress : null
  // Each map on a page gets its own ids, so the gradient and caption never clash.
  const id = useId().replace(/:/g, '')
  return (
    <figure className={cn('relative', className)}>
      <svg viewBox={BRITAIN.viewBox} className="block h-auto w-full overflow-visible" role="img" aria-labelledby={`${id}-caption`}>
        <defs>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#94701F" />
            <stop offset="0.4" stopColor="#E9CC7B" />
            <stop offset="0.7" stopColor="#B58A2F" />
            <stop offset="1" stopColor="#F2DC9C" />
          </linearGradient>
        </defs>
        <path d={BRITAIN.path} fill="#F5F1EF" stroke="#8E1B2E" strokeWidth="1.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {a && (
          <g transform={`translate(${BRITAIN.burnley.x} ${BRITAIN.burnley.y})`}>
            <circle r="11" fill="#8E1B2E" opacity="0.12" />
            <path d={HEART} fill={`url(#${id}-gold)`} stroke="#4A0D17" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {a && (
        <span
          aria-hidden="true"
          className="absolute whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold leading-none text-velvet ring-1 ring-line"
          style={{ left: pct(BRITAIN.burnley.x, MAP_W), top: pct(BRITAIN.burnley.y, MAP_H), transform: 'translate(16px, -50%)' }}
        >
          {a.locality} showroom
        </span>
      )}
      <figcaption id={`${id}-caption`} className="sr-only">
        {caption ?? `Map of mainland Great Britain, where delivery is free${a ? `, with our showroom in ${a.locality} marked` : ''}.`}
      </figcaption>
    </figure>
  )
}
