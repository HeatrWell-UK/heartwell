import { StarHalfIcon, StarIcon } from '@phosphor-icons/react/ssr'

/** A star rating, read out as "4.5 out of 5". Halves are shown for averages. */
export function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2
  return (
    <span className="inline-flex gap-0.5 text-gold" role="img" aria-label={`${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) =>
        rounded >= i + 1 ? (
          <StarIcon key={i} aria-hidden="true" size={size} weight="fill" />
        ) : rounded >= i + 0.5 ? (
          <StarHalfIcon key={i} aria-hidden="true" size={size} weight="fill" />
        ) : (
          <StarIcon key={i} aria-hidden="true" size={size} />
        ),
      )}
    </span>
  )
}
