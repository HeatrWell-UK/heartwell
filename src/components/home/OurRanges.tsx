import Image from 'next/image'
import Link from 'next/link'
import { Price } from '@/components/ui/Price'
import { WhenNear } from '@/components/ui/WhenNear'
import type { RangeSummary } from '@/lib/catalogue/listing'

/**
 * "Our ranges": one design in several sizes each. A row to swipe on phones
 * (the next card peeks in, so it's clear there's more), a grid on desktops.
 * Featured is the owner's choice in the catalogue; nothing here claims sales.
 */
export function OurRanges({ ranges, total }: { ranges: RangeSummary[]; total: number }) {
  if (ranges.length === 0) return null
  return (
    <section aria-labelledby="ranges" className="mx-auto flex max-w-[1200px] flex-col gap-6 pt-14 lg:gap-8 lg:px-6 lg:pt-24">
      <div className="flex flex-col gap-2 px-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-0">
        <div className="flex flex-col gap-2">
          <h2 id="ranges" className="text-[30px] leading-tight lg:text-[42px]">
            Our ranges
          </h2>
          <p className="max-w-[34rem] text-[16px] leading-relaxed text-slate lg:text-[17px]">
            Each range is one design in several sizes, so you can pick the shape that fits your room and keep the look.
          </p>
        </div>
        <Link href="/ranges" className="hidden shrink-0 text-[16px] font-semibold lg:block">
          See all {total} ranges
        </Link>
      </div>

      <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10 lg:overflow-visible lg:px-0">
        {ranges.map((r) => {
          // Sizes, not pieces: a range can offer each size with two back styles.
          const sizes = new Set(r.products.map((p) => p.axis1Value ?? p.slug)).size
          return (
            <li key={r.slug} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
              <Link href={`/ranges/${r.slug}`} className="group flex flex-col gap-3 text-ink no-underline hover:text-ink">
                <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-stone">
                  {r.image && (
                    <WhenNear className="absolute inset-0">
                      <Image src={r.image} alt={r.imageAlt} fill sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 42vw, 72vw" className="object-cover" />
                    </WhenNear>
                  )}
                </span>
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-display text-[24px] leading-tight group-hover:text-velvet">{r.name}</span>
                    <span className="text-[14px] text-slate">
                      {sizes} {sizes === 1 ? 'size' : 'sizes'}
                      {r.madeToOrder ? ', made to order' : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 pt-1">
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
            </li>
          )
        })}
      </ul>

      <div className="px-4 lg:hidden">
        <Link href="/ranges" className="text-[16px] font-semibold">
          See all {total} ranges
        </Link>
      </div>
    </section>
  )
}
