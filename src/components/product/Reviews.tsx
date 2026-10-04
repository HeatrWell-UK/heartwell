import { StarIcon } from '@phosphor-icons/react/ssr'
import { ukDate } from '@/lib/format'
import type { ReviewView } from '@/lib/product/types'

/**
 * Only real reviews from real customers, approved by the shop. Until the first
 * ones arrive, an honest empty state says so.
 */
export function Reviews({ reviews, name, askHref, askLabel }: { reviews: ReviewView[]; name: string; askHref: string; askLabel: string }) {
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  return (
    <section aria-labelledby="reviews" className="flex flex-col gap-3">
      <h2 id="reviews" className="text-2xl">
        Reviews
      </h2>
      {reviews.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-dashed border-field px-4 py-[18px]">
          <p className="font-semibold">No reviews yet</p>
          <p className="text-[15px] leading-relaxed text-slate">
            {name} is new to Heartwell. We only publish reviews from people who bought from us, so the first ones will come from our first
            customers.
          </p>
          <a href={askHref} className="pt-0.5 text-[15px] font-semibold">
            {askLabel}
          </a>
        </div>
      ) : (
        <>
          <p className="text-[15px] text-slate">
            {average.toFixed(1)} out of 5 from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
          <ul className="flex flex-col gap-3">
            {reviews.map((r) => (
              <li key={`${r.name}-${r.date}`} className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-line p-4">
                <span className="flex gap-0.5 text-gold" role="img" aria-label={`${r.rating} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon key={i} aria-hidden="true" size={18} weight={i < r.rating ? 'fill' : 'regular'} />
                  ))}
                </span>
                {r.title && <p className="font-semibold">{r.title}</p>}
                {r.comment && <p className="text-[15px] leading-relaxed text-body-dark">{r.comment}</p>}
                <p className="text-sm text-slate">
                  {r.name}, {ukDate(new Date(r.date), { weekday: false, year: true })}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
