import type { Metadata } from 'next'
import { RangeCard } from '@/components/catalogue/RangeCard'
import { VelvetHeader } from '@/components/catalogue/VelvetHeader'
import { formatPrice } from '@/lib/format'
import { getListing, rangesFrom } from '@/lib/catalogue/listing'
import { homeRanges } from '@/lib/home/picks'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop by range',
  description: 'Every Heartwell sofa range, from Ashton to Windsor: the sizes each comes in, its colours and the price it starts from.',
  alternates: { canonical: '/ranges' },
}

export default async function RangesPage() {
  const ranges = rangesFrom(await getListing())
  const from = ranges.length ? Math.min(...ranges.map((r) => r.price)) : null
  return (
    <div className="pb-16 lg:pb-24">
      <VelvetHeader crumbs={[{ name: 'Sofas', href: '/sofas' }]} title="Our ranges" photo={homeRanges(ranges, 1)[0]?.image}>
        {from !== null && (
          <p className="text-[16px] text-on-wine lg:text-[17px]">
            {ranges.length} ranges, from <span className="font-semibold text-white">{formatPrice(from)}</span>
          </p>
        )}
        <p className="max-w-[44rem] pt-1 text-[16px] leading-relaxed text-on-wine lg:text-[17px]">
          Each range is one design in several sizes, so you can pick the shape that fits your room and keep the look. Open a range to see every
          size drawn to scale.
        </p>
      </VelvetHeader>
      <div className="mx-auto max-w-[1200px] px-4 pt-8 lg:px-6 lg:pt-12">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
          {ranges.map((r, i) => (
            <li key={r.slug}>
              <RangeCard range={r} eager={i < 2} sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 47vw" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
