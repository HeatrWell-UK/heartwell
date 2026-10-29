import Image from 'next/image'
import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { cn } from '@/lib/cn'

/**
 * The head of a shop listing (category pages, all ranges) on the home page's
 * lit velvet (docs/DESIGN.md, revision 4): where the page sits, its name in
 * gold, what's in it, and beside it a small lit alcove holding the owner's
 * photo for it (or `aside` when there's no photo). It stands on a gold line.
 * `intro` shows here on desktops only: phones get it at the foot of the page,
 * so the sofas come first.
 */
export function VelvetHeader({
  crumbs,
  title,
  intro,
  photo,
  aside,
  children,
}: {
  crumbs: { name: string; href: string }[]
  title: string
  intro?: string | null
  /** Decorative: the title already says what it shows. */
  photo?: string | null
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="hw-velvet hw-gold-edge text-white">
      <Breadcrumbs items={crumbs} onVelvet />
      <div
        className={cn(
          'mx-auto flex max-w-[1200px] items-end justify-between gap-5 px-4 pb-6 lg:gap-14 lg:px-6 lg:pb-10',
          crumbs.length ? 'pt-1 lg:pt-2' : 'pt-7 lg:pt-10',
        )}
      >
        <div className="flex min-w-0 flex-col gap-2 pb-1">
          <h1 className="text-gold-lit text-[36px] leading-[1.06] lg:text-[60px]">{title}</h1>
          {children}
          {intro && <p className="hidden max-w-[44rem] pt-2 text-[17px] leading-relaxed text-on-wine lg:block">{intro}</p>}
        </div>
        {photo ? (
          <div className="hw-alcove w-[88px] shrink-0 sm:w-[124px] lg:w-[230px]">
            <span aria-hidden="true" className="hw-alcove-glow" />
            <span aria-hidden="true" className="hw-alcove-rim" />
            <span className="hw-alcove-photo">
              <Image src={photo} alt="" fill sizes="(min-width: 1024px) 250px, (min-width: 640px) 134px, 96px" loading="eager" />
              <span aria-hidden="true" className="hw-alcove-dim" />
            </span>
            <span aria-hidden="true" className="hw-alcove-line" />
          </div>
        ) : (
          aside
        )}
      </div>
    </header>
  )
}
