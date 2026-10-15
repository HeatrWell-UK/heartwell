import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { RangeCard } from '@/components/catalogue/RangeCard'
import { getListing, rangesFrom } from '@/lib/catalogue/listing'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Shop by range',
  description: 'Every Heartwell sofa range, from Ashton to Windsor: the sizes each comes in, its colours and the price it starts from.',
  alternates: { canonical: '/ranges' },
}

export default async function RangesPage() {
  const ranges = rangesFrom(await getListing())
  return (
    <div className="pb-16 lg:pb-24">
      <Breadcrumbs items={[{ name: 'Sofas', href: '/sofas' }]} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pt-2 lg:gap-10 lg:px-6 lg:pt-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-[34px] leading-[1.08] lg:text-[52px]">Our ranges</h1>
          <p className="max-w-[44rem] text-[17px] leading-relaxed text-slate">
            Each range is one design in several sizes, so you can pick the shape that fits your room and keep the look. Open a range to see
            every size drawn to scale.
          </p>
        </header>
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
