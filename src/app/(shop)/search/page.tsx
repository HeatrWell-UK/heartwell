import type { Metadata } from 'next'
import Link from 'next/link'
import Form from 'next/form'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { ProductGrid } from '@/components/catalogue/ProductTile'
import { getCategories, getListing } from '@/lib/catalogue/listing'
import { searchCatalogue } from '@/lib/catalogue/search'

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
}

const SUGGESTIONS = ['Corner sofa', 'U-shaped', '3+2 set', 'Electric recliner', 'Grey', 'Armchair']

type Props = { searchParams: Promise<{ q?: string | string[] }> }

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 80).trim() ?? ''
  const [listing, tree] = await Promise.all([getListing(), getCategories()])
  const names = new Map(tree.map((c) => [c.id, c.name]))
  const result = q ? searchCatalogue(listing, q, (p) => p.categoryIds.map((id) => names.get(id) ?? '')) : null

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-6 lg:px-6 lg:pt-10">
      <h1 className="text-[32px] leading-tight lg:text-[40px]">{q ? `Results for “${q}”` : 'Search'}</h1>

      <Form action="/search" role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search sofas
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Try “corner grey” or “recliner”"
          className="h-[52px] min-w-0 flex-1 rounded-[var(--radius-field)] border-[1.5px] border-field bg-white px-3.5 text-ink placeholder:text-slate/70 focus:border-velvet focus:shadow-[0_0_0_4px_var(--color-gold-tint)] focus:outline-none"
        />
        <button type="submit" className="flex h-[52px] shrink-0 items-center gap-2 rounded-[var(--radius-field)] bg-velvet-sheen px-5 font-semibold text-white">
          <MagnifyingGlassIcon aria-hidden="true" size={20} />
          Search
        </button>
      </Form>

      {result && (
        <p role="status" className="text-[15px] text-slate">
          {result.products.length === 0
            ? 'Nothing matches that. Try fewer words, or one of the ideas below.'
            : result.partial
              ? `Nothing matches every word, so here are the closest ${result.products.length}.`
              : `${result.products.length} ${result.products.length === 1 ? 'match' : 'matches'}.`}
        </p>
      )}

      {result && result.products.length > 0 && <ProductGrid products={result.products} />}

      {(!result || result.products.length === 0) && (
        <section aria-labelledby="ideas" className="flex flex-col gap-3">
          <h2 id="ideas" className="text-xl">
            Popular searches
          </h2>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="flex min-h-11 items-center rounded-full border border-line px-4 text-[15px] font-semibold text-ink no-underline hover:border-velvet"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
