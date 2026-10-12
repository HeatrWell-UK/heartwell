import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ukDate } from '@/lib/format'

/**
 * The frame for every long-form page (policies, guides, About): breadcrumbs,
 * a title, a plain introduction, the date it last changed, an optional
 * "On this page" list, and the text in a readable column.
 */
export function ContentPage({
  title,
  intro,
  updated,
  contents,
  crumbs = [],
  children,
}: {
  title: string
  intro?: ReactNode
  /** ISO date the wording last changed (policies say so; customers and regulators look for it). */
  updated?: string
  /** Section anchors for "On this page". */
  contents?: { id: string; label: string }[]
  crumbs?: { name: string; href: string }[]
  children: ReactNode
}) {
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <article className="mx-auto flex max-w-[46rem] flex-col gap-6 px-4 pb-16 pt-4 lg:pt-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-[34px] leading-[1.1] lg:text-[48px]">{title}</h1>
          {intro && <div className="text-[17px] leading-relaxed text-slate lg:text-[18px]">{intro}</div>}
          {updated && <p className="text-sm text-slate">Last updated {ukDate(new Date(`${updated}T12:00:00Z`), { weekday: false, year: true, timeZone: 'UTC' })}</p>}
        </header>
        {contents && contents.length > 2 && (
          <nav aria-labelledby="on-this-page" className="rounded-[var(--radius-card)] bg-stone p-5">
            <h2 id="on-this-page" className="font-sans text-[15px] font-bold tracking-normal">
              On this page
            </h2>
            <ol className="mt-2 flex flex-col gap-1.5 text-[15px]">
              {contents.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`}>{c.label}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="hw-prose">{children}</div>
      </article>
    </>
  )
}

/** A highlighted note inside long-form text: something a customer mustn't miss. */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-1.5 rounded-[var(--radius-card)] bg-gold-cream-tint p-4 text-[15px] leading-relaxed">
      <strong className="text-ink">{title}</strong>
      <div>{children}</div>
    </aside>
  )
}
