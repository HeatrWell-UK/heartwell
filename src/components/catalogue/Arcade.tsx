import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** An alcove either side of the middle one: a link with its name and price on a plate. */
export interface SideAlcove {
  key: string
  href: string
  image: string | null
  title: string
  detail: string
}

// The photos are square and cropped to each arch (object-fit: cover), so each is shown a little wider than its alcove.
const SIDE_SIZES = ['(min-width: 1024px) 21vw, (min-width: 640px) 28vw, 50vw', '(min-width: 1024px) 21vw, (min-width: 640px) 28vw, 50vw', '17vw', '17vw']

/**
 * The gallery of alcoves (docs/DESIGN.md, revision 4; globals.css .hw-arcade):
 * a large alcove in the middle holding the page's main photo, and up to four
 * smaller ones either side, standing on a common floor. Phones show the middle
 * one with the next two peeking out from behind it; 640px+ three; 1024px+
 * five. They light up one after another as the page opens.
 *
 * The middle alcove's own extras (a medallion, a button on its floor) come in
 * as children. `square` for a range's cover, which is wider than the home
 * page's room photo.
 */
export function Arcade({
  main,
  side,
  sideLabel,
  square = false,
  className,
  children,
}: {
  main: { src: string | null; alt: string; sizes: string }
  side: SideAlcove[]
  sideLabel: string
  square?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn('hw-arcade', className)}>
      <div className={cn('hw-alcove hw-arcade-main', square && 'hw-alcove-square')}>
        <span aria-hidden="true" className="hw-alcove-glow" />
        <span aria-hidden="true" className="hw-alcove-rim" />
        <span className="hw-alcove-photo">
          {main.src && <Image src={main.src} alt={main.alt} fill sizes={main.sizes} loading="eager" fetchPriority="high" />}
          <span aria-hidden="true" className="hw-alcove-dim" />
        </span>
        <span aria-hidden="true" className="hw-alcove-line" />
        {children}
      </div>

      {side.length > 0 && (
        <ul className="hw-arcade-side" aria-label={sideLabel}>
          {side.slice(0, 4).map((s, i) => (
            <li key={s.key}>
              <Link href={s.href} className="hw-alcove group text-white no-underline hover:text-white">
                <span aria-hidden="true" className="hw-alcove-glow" />
                <span aria-hidden="true" className="hw-alcove-rim" />
                <span className="hw-alcove-photo">
                  {s.image && <Image src={s.image} alt="" fill sizes={SIDE_SIZES[i]} />}
                  <span aria-hidden="true" className="hw-alcove-dim" />
                </span>
                <span aria-hidden="true" className="hw-alcove-line" />
                <span className="hw-plaque">
                  <span className="text-gold-lit font-display text-[18px] leading-none lg:text-[20px]">{s.title}</span>{' '}
                  <span className="text-[13px] leading-none text-on-wine-muted">{s.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * A gold coin on the middle alcove: "To pay today £0", "from £429". Longer
 * figures are set smaller, so they stay inside it. `small` for the product
 * page's photo, where it sits on the floor at the alcove's foot.
 */
export function Medallion({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  const size = small
    ? 'text-[30px] lg:text-[36px]'
    : value.length <= 2
      ? 'text-[44px] lg:text-[52px]'
      : value.length <= 4
        ? 'text-[34px] lg:text-[40px]'
        : 'text-[27px] lg:text-[32px]'
  return (
    <p className={cn('hw-medallion', small && 'hw-medallion-sm')}>
      <span className={cn('font-semibold', small ? 'text-[11px] lg:text-[12px]' : 'text-[13px] lg:text-[14px]')}>{label}</span>
      <span className={cn('font-display leading-none', size)}>{value}</span>
    </p>
  )
}

/** What stands on the middle alcove's floor: its button. */
export function AlcoveFloor({ children }: { children: ReactNode }) {
  return <div className="hw-alcove-floor">{children}</div>
}
