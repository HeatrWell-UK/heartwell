import { ButtonLink } from '@/components/ui/Button'
import { ProductTile } from '@/components/catalogue/ProductTile'
import type { ListingProduct } from '@/lib/catalogue/listing-types'

/**
 * "Popular right now": the pieces the shop features, one per range so the
 * four look different, photographed ones only. Featured is the owner's
 * choice in the catalogue; nothing here claims sales numbers.
 */
export function pickPopular(listing: ListingProduct[], count = 4): ListingProduct[] {
  const seen = new Set<string>()
  const picks: ListingProduct[] = []
  const candidates = [...listing].filter((p) => p.image).sort((a, b) => Number(b.featured) - Number(a.featured) || a.rangeSort - b.rangeSort || a.sort - b.sort)
  for (const p of candidates) {
    const key = p.rangeSlug ?? p.slug
    if (seen.has(key)) continue
    seen.add(key)
    picks.push(p)
    if (picks.length === count) break
  }
  return picks
}

export function PopularNow({ products, allHref, allLabel }: { products: ListingProduct[]; allHref: string; allLabel: string }) {
  if (products.length === 0) return null
  return (
    <section aria-labelledby="popular" className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-10 lg:px-6 lg:pt-16">
      <h2 id="popular" className="text-[28px] leading-tight lg:text-[34px]">
        Popular right now
      </h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-4 lg:gap-x-6">
        {products.map((p) => (
          <li key={p.slug}>
            <ProductTile product={p} defer />
          </li>
        ))}
      </ul>
      <ButtonLink href={allHref} variant="secondary" block className="lg:w-auto lg:self-center lg:px-10">
        {allLabel}
      </ButtonLink>
    </section>
  )
}
