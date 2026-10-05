import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from '@phosphor-icons/react/ssr'
import { Price } from '@/components/ui/Price'
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
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-6 lg:px-6 lg:pt-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-tight lg:text-[44px]">Shop by range</h1>
        <p className="max-w-[46rem] text-[17px] leading-relaxed text-slate">
          Each range is one design in several sizes, so you can pick the shape that fits your room and keep the look.
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
        {ranges.map((r, i) => (
          <li key={r.slug}>
            <Link href={`/ranges/${r.slug}`} className="flex flex-col gap-2 text-ink no-underline hover:text-ink">
              <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-stone">
                {r.image ? (
                  <Image
                    src={r.image}
                    alt={r.imageAlt}
                    fill
                    priority={i < 2}
                    sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 47vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-slate">
                    <ImageIcon aria-hidden="true" size={28} />
                  </span>
                )}
              </span>
              <span className="font-display text-xl font-bold leading-tight">{r.name}</span>
              <span className="text-[13px] text-slate">
                {r.products.length} {r.products.length === 1 ? 'piece' : 'pieces'}
                {r.madeToOrder ? ' · made to order' : ''}
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[13px] text-slate">from</span>
                <Price amount={r.price} className="text-lg" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
