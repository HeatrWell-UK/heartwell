import Link from 'next/link'
import type { ReactNode } from 'react'
import { SealCheckIcon } from '@phosphor-icons/react/ssr'
import { Stars } from '@/components/ui/Stars'
import { ukDate } from '@/lib/format'
import type { ReviewView } from '@/lib/product/types'

/**
 * Only real reviews from real customers, approved by the shop. Until the first
 * ones arrive, an honest empty state says so.
 */
export function Reviews({ reviews, stats, name, ask }: { reviews: ReviewView[]; stats: { count: number; average: number } | null; name: string; ask: ReactNode }) {
  return (
    <section aria-labelledby="reviews" className="flex flex-col gap-3">
      <h2 id="reviews" className="text-2xl">
        Reviews
      </h2>
      {reviews.length === 0 || !stats ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-dashed border-field px-4 py-[18px]">
          <p className="font-semibold">No reviews yet</p>
          <p className="text-[15px] leading-relaxed text-slate">
            {name} is new to Heartwell. We only publish reviews from people who bought from us, so the first ones will come from our first
            customers.
          </p>
          <div className="pt-0.5 text-[15px] font-semibold">{ask}</div>
        </div>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-slate">
            <Stars rating={stats.average} size={18} />
            <span>
              {stats.average.toFixed(1)} out of 5 from {stats.count} {stats.count === 1 ? 'review' : 'reviews'}
            </span>
          </p>
          <ul className="flex flex-col gap-3">
            {reviews.slice(0, 6).map((r) => (
              <li key={`${r.name}-${r.date}`} className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-line p-4">
                <Stars rating={r.rating} size={18} />
                {r.title && <p className="font-semibold">{r.title}</p>}
                {r.comment && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body-dark">{r.comment}</p>}
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate">
                  <span>
                    {r.name}, {ukDate(new Date(r.date), { weekday: false, year: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <SealCheckIcon aria-hidden="true" size={16} className="text-velvet" />
                    Bought from us
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <Link href="/reviews" className="self-start text-[15px] font-semibold">
            Read all our reviews
          </Link>
        </>
      )}
    </section>
  )
}
