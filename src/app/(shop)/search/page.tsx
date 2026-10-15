import type { Metadata } from 'next'
import Link from 'next/link'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { ProductGrid } from '@/components/catalogue/ProductTile'
import { ShapeRail } from '@/components/catalogue/ShapeRail'
import { SearchBox } from '@/components/catalogue/SearchBox'
import { getCategories, getListing } from '@/lib/catalogue/listing'
import { searchCatalogue } from '@/lib/catalogue/search'

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
}

const SUGGESTIONS = ['Corner sofa', 'U-shaped', '3+2 set', 'Electric recliner', 'Grey', 'Velvet', 'Armchair']

type Props = { searchParams: Promise<{ q?: string | string[] }> }

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 80).trim() ?? ''
  const [listing, tree] = await Promise.all([getListing(), getCategories()])
  const names = new Map(tree.map((c) => [c.id, c.name]))
  const result = q ? searchCatalogue(listing, q, (p) => p.categoryIds.map((id) => names.get(id) ?? '')) : null
  const department = tree.find((c) => c.slug === 'sofas' && c.parentId === null) ?? tree.find((c) => c.parentId === null)
  const nothing = !result || result.products.length === 0

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-6 lg:gap-8 lg:px-6 lg:pb-24 lg:pt-10">
      <h1 className="text-[34px] leading-[1.08] lg:text-[52px]">{q ? `Results for “${q}”` : 'Search'}</h1>

      <SearchBox defaultValue={q} />

      {result && (
        <p role="status" className="text-[16px] text-slate">
          {result.products.length === 0
            ? 'Nothing matches that. Try fewer words, or browse by shape below.'
            : result.partial
              ? `Nothing matches every word, so here are the closest ${result.products.length}.`
              : `${result.products.length} ${result.products.length === 1 ? 'match' : 'matches'}.`}
        </p>
      )}

      {result && result.products.length > 0 && <ProductGrid products={result.products} />}

      {nothing && (
        <div className="flex flex-col gap-8 lg:gap-10">
          {department && (
            <section aria-labelledby="by-shape" className="flex flex-col gap-3">
              <h2 id="by-shape" className="text-[24px] leading-tight lg:text-[28px]">
                Browse by shape
              </h2>
              <ShapeRail tree={tree} node={null} department={department} alwaysTop />
            </section>
          )}
          <section aria-labelledby="ideas" className="flex flex-col gap-3">
            <h2 id="ideas" className="text-[24px] leading-tight lg:text-[28px]">
              Popular searches
            </h2>
            <ul className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[15px] font-semibold text-ink no-underline hover:border-velvet hover:text-ink"
                  >
                    <MagnifyingGlassIcon aria-hidden="true" size={16} className="text-slate" />
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
