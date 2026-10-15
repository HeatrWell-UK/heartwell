import type { ReactNode } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react/ssr'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { cn } from '@/lib/cn'
import { ukDate } from '@/lib/format'

/**
 * The frame for every long-form page (policies, guides, About, delivery): breadcrumbs, a
 * title, a plain introduction, the date it last changed, an optional figure (a
 * photo or the delivery map), and the text in a readable column. Long pages get
 * "On this page": a list to fold away on phones, and a list that stays beside the
 * text on desktops.
 */
export function ContentPage({
  title,
  intro,
  updated,
  contents,
  crumbs = [],
  figure,
  children,
}: {
  title: string
  intro?: ReactNode
  /** ISO date the wording last changed (policies say so; customers and regulators look for it). */
  updated?: string
  /** Section anchors for "On this page". */
  contents?: { id: string; label: string }[]
  crumbs?: { name: string; href: string }[]
  /** Shown under the introduction, before the text. */
  figure?: ReactNode
  children: ReactNode
}) {
  const toc = contents && contents.length > 2 ? contents : null
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className={cn('mx-auto px-4 pb-16 pt-4 lg:pb-24 lg:pt-8', toc ? 'max-w-[1200px] lg:px-6' : 'max-w-[46rem]')}>
        <div className={cn(toc && 'lg:grid lg:grid-cols-[220px_minmax(0,46rem)] lg:justify-between lg:gap-16')}>
          <article className="flex flex-col gap-7 lg:col-start-2">
            <header className="flex flex-col gap-3">
              <h1 className="text-[38px] leading-[1.06] lg:text-[56px]">{title}</h1>
              {intro && <div className="text-[17px] leading-relaxed text-slate lg:text-[19px]">{intro}</div>}
              {updated && (
                <p className="text-sm text-slate">Last updated {ukDate(new Date(`${updated}T12:00:00Z`), { weekday: false, year: true, timeZone: 'UTC' })}</p>
              )}
            </header>

            {figure}

            {toc && (
              <details className="group rounded-[var(--radius-card)] border border-line lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                  On this page
                  <CaretDownIcon aria-hidden="true" size={18} className="text-velvet transition-transform group-open:rotate-180" />
                </summary>
                <ol className="flex flex-col gap-2 border-t border-line-soft px-4 pb-4 pt-3 text-[15px]">
                  {toc.map((c) => (
                    <li key={c.id}>
                      <a href={`#${c.id}`}>{c.label}</a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div className="hw-prose">{children}</div>
          </article>

          {toc && (
            <nav aria-label="On this page" className="hidden lg:col-start-1 lg:row-start-1 lg:block">
              <div className="sticky top-8 flex flex-col gap-3 border-l border-line pl-5 pt-1">
                <span className="text-[15px] font-bold">On this page</span>
                <ol className="flex flex-col gap-2 text-[15px] leading-snug">
                  {toc.map((c) => (
                    <li key={c.id}>
                      <a href={`#${c.id}`} className="text-slate no-underline hover:text-velvet hover:underline">
                        {c.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
          )}
        </div>
      </div>
    </>
  )
}

/** A highlighted note inside long-form text: something a customer mustn't miss. */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border-l-[3px] border-gold bg-gold-cream-tint p-4 text-[15px] leading-relaxed">
      <strong className="text-ink">{title}</strong>
      <div>{children}</div>
    </aside>
  )
}
