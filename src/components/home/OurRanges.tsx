import Link from 'next/link'
import { RangeCard } from '@/components/catalogue/RangeCard'
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
        {ranges.map((r) => (
          <li key={r.slug} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
            <RangeCard range={r} sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 42vw, 72vw" />
          </li>
        ))}
      </ul>

      <div className="px-4 lg:hidden">
        <Link href="/ranges" className="text-[16px] font-semibold">
          See all {total} ranges
        </Link>
      </div>
    </section>
  )
}
