import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from '@phosphor-icons/react/ssr'
import { Price } from '@/components/ui/Price'
import { WhenNear } from '@/components/ui/WhenNear'
import type { RangeSummary } from '@/lib/catalogue/listing'
import { cn } from '@/lib/cn'

/** Sizes, not pieces: a range can offer each size with two back styles. */
export const rangeSizeCount = (r: RangeSummary) => new Set(r.products.map((p) => p.axis1Value ?? p.slug)).size

/**
 * One range: its cover photo, name, how many sizes, whether it's made to
 * order, the price it starts from and its colours. Used on the home page, the
 * ranges page and under each range.
 */
export function RangeCard({
  range: r,
  sizes,
  eager = false,
  reveal = false,
  photoClassName,
}: {
  range: RangeSummary
  sizes: string
  eager?: boolean
  /** Let the photo settle in its arch as it scrolls in (the home page; globals.css .hw-settle). */
  reveal?: boolean
  /** The photo frame's shape when it isn't square (the home page's featured range). */
  photoClassName?: string
}) {
  const count = rangeSizeCount(r)
  const image = r.image && (
    <Image
      src={r.image}
      alt={r.imageAlt}
      fill
      loading={eager ? 'eager' : undefined}
      fetchPriority={eager ? 'high' : undefined}
      sizes={sizes}
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
    />
  )
  return (
    // A container: narrow cards (two across a phone) stack the price under the name; wider ones set it beside.
    <Link href={`/ranges/${r.slug}`} className="group @container flex flex-col gap-3 text-ink no-underline hover:text-ink">
      <span className={cn('hw-niche hw-niche-square bg-stone', reveal && 'hw-settle', photoClassName)}>
        {image ? (
          eager ? (
            image
          ) : (
            <WhenNear className="absolute inset-0">{image}</WhenNear>
          )
        ) : (
          <span className="flex h-full items-center justify-center text-slate">
            <ImageIcon aria-hidden="true" size={28} />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5 @[15rem]:flex-row @[15rem]:items-start @[15rem]:justify-between @[15rem]:gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-display text-[21px] leading-tight group-hover:text-velvet @[15rem]:text-[24px]">{r.name}</span>
          <span className="text-[14px] text-slate">
            {count} {count === 1 ? 'size' : 'sizes'}
            {r.madeToOrder ? ', made to order' : ''}
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-1.5 @[15rem]:flex-col @[15rem]:items-end @[15rem]:gap-0.5 @[15rem]:pt-1">
          <span className="text-[13px] leading-none text-slate">from</span>
          <Price amount={r.price} className="text-[20px]" />
        </span>
      </span>
      {r.colours.length > 0 && (
        <span className="flex items-center gap-1.5" role="img" aria-label={`Colours: ${r.colours.map((c) => c.name).join(', ')}`}>
          {r.colours.slice(0, 6).map((c) => (
            <span key={c.name} className="size-3.5 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex ?? '#F5F1EF' }} />
          ))}
          {r.colours.length > 6 && <span className="text-[13px] text-slate">+{r.colours.length - 6}</span>}
        </span>
      )}
    </Link>
  )
}
