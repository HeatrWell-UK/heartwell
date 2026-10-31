'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { CatalogueControls, FilterPanel } from './CatalogueControls'
import { ProductGrid } from './ProductTile'
import { buttonClasses } from '@/components/ui/Button'
import { activeChips, applyFilters, facetsFor, hasFilters, listingHref, parseListing, sortProducts } from '@/lib/catalogue/filters'
import type { ListingProduct } from '@/lib/catalogue/listing-types'

/**
 * A category's grid with its filters and sorting, worked out in the browser
 * (audit A4): the page itself is the same cached page for every address, so a
 * visit from an ad or a search is served straight from the cache, and ticking
 * a filter changes the grid at once, with no trip to the server. The address
 * keeps the filters (so a filtered page can still be shared); a shared one is
 * applied as soon as the page is running. Search engines see the whole
 * category, as before.
 */

// An event, not storage (the hw- prefix is kept for cookies and storage keys, listed on /cookies).
const CHANGED = 'heartwell:listing-change'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(CHANGED, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(CHANGED, onChange)
  }
}

/** "?shape=corner&colour=grey&colour=blue" as parseListing reads it. */
function paramsOf(search: string): Record<string, string[]> {
  const params: Record<string, string[]> = {}
  new URLSearchParams(search).forEach((value, key) => (params[key] ??= []).push(value))
  return params
}

export function CategoryListing({ products, path, noun }: { products: ListingProduct[]; path: string; noun: string }) {
  // The cached page has no filters; the browser's own address says which apply.
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  )
  const { filters, sort } = useMemo(() => parseListing(paramsOf(search)), [search])
  const shown = useMemo(() => sortProducts(applyFilters(products, filters), sort), [products, filters, sort])

  const go = (href: string) => {
    window.history.replaceState(null, '', href)
    window.dispatchEvent(new Event(CHANGED))
  }

  const controls = {
    path,
    facets: facetsFor(products, filters),
    filters,
    sort,
    chips: activeChips(path, filters, sort),
    count: shown.length,
    noun,
    go,
  }

  return (
    <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-6">
          <FilterPanel {...controls} />
        </div>
      </aside>
      <div className="flex flex-col gap-5">
        <CatalogueControls {...controls} />
        {/* Said out loud whenever it changes; seen only once filters narrow the list (the header gives the total). */}
        <p className={hasFilters(filters) ? 'text-[15px] text-slate lg:hidden' : 'sr-only'} aria-live="polite">
          {shown.length} {shown.length === 1 ? noun : `${noun}s`}
        </p>
        {shown.length > 0 ? (
          <ProductGrid products={shown} />
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-stone p-5">
            <p className="font-semibold">Nothing matches all of those filters.</p>
            <p className="text-[15px] text-slate">Try taking one off, or start again.</p>
            <button type="button" onClick={() => go(listingHref(path, filters, sort, 'clear'))} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
