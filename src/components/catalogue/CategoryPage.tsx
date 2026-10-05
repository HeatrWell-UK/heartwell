import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ButtonLink } from '@/components/ui/Button'
import { CatalogueControls, FilterPanel } from './CatalogueControls'
import { ProductGrid } from './ProductTile'
import { getCategories, getListing, sentenceCase } from '@/lib/catalogue/listing'
import { activeChips, applyFilters, facetsFor, hasFilters, listingHref, parseListing, sortProducts } from '@/lib/catalogue/filters'
import { categoryHref, childrenOf, resolveCategory, subtreeIds, trail } from '@/lib/catalogue/tree'
import { breadcrumbJsonLd, jsonLdString } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'

export type CategoryRouteProps = {
  params: Promise<{ department: string; category?: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const paragraphs = (text: string | null) => (text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

export async function categoryMetadata({ params, searchParams }: CategoryRouteProps): Promise<Metadata> {
  const { department, category } = await params
  const tree = await getCategories()
  const node = resolveCategory(tree, department, category)
  if (!node) return {}
  const { filters, sort } = parseListing(await searchParams)
  const filtered = hasFilters(filters) || sort !== 'recommended'
  return {
    title: node.seoTitle ?? node.name,
    description: node.seoDescription ?? paragraphs(node.description)[0] ?? undefined,
    alternates: { canonical: categoryHref(tree, node) },
    // Filtered and sorted versions point search engines at the plain page.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
}

export async function CategoryPage({ params, searchParams }: CategoryRouteProps) {
  const [{ department, category }, query, tree, listing] = await Promise.all([params, searchParams, getCategories(), getListing()])
  const node = resolveCategory(tree, department, category)
  if (!node) notFound()

  const path = categoryHref(tree, node)
  const inside = subtreeIds(tree, node.id)
  const products = listing.filter((p) => p.categoryIds.some((id) => inside.has(id)))
  const { filters, sort } = parseListing(query)
  const shown = sortProducts(applyFilters(products, filters), sort)
  const facets = facetsFor(products, filters)
  const chips = activeChips(path, filters, sort)
  const crumbs = trail(tree, node).slice(0, -1).map((c) => ({ name: c.name, href: categoryHref(tree, c) }))
  const children = childrenOf(tree, node.id)
  const [intro, ...more] = paragraphs(node.description)
  const noun = products.every((p) => p.typeSlug === 'sofa') ? 'sofa' : 'piece'
  const controls = { path, facets, filters, sort, chips, count: shown.length, noun }

  return (
    <div className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd([...crumbs.map((c) => ({ name: c.name, path: c.href })), { name: node.name, path }], SITE_URL)) }}
      />
      <Breadcrumbs items={crumbs} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-2 lg:px-6 lg:pt-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-[32px] leading-tight lg:text-[44px]">{node.name}</h1>
          {intro && <p className="max-w-[46rem] text-[17px] leading-relaxed text-slate">{intro}</p>}
        </header>

        {children.length > 0 && (
          <nav aria-label={`Kinds of ${node.name.toLowerCase()}`}>
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {children.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={categoryHref(tree, c)}
                    className="flex min-h-11 items-center rounded-full border border-line px-4 text-[15px] font-semibold text-ink no-underline hover:border-velvet"
                  >
                    {sentenceCase(c.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-6">
              <FilterPanel {...controls} />
            </div>
          </aside>
          <div className="flex flex-col gap-5">
            <CatalogueControls {...controls} />
            <p className="text-[15px] text-slate lg:hidden" aria-live="polite">
              {shown.length} {shown.length === 1 ? noun : `${noun}s`}
            </p>
            {shown.length > 0 ? (
              <ProductGrid products={shown} />
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-stone p-5">
                <p className="font-semibold">Nothing matches all of those filters.</p>
                <p className="text-[15px] text-slate">Try taking one off, or start again.</p>
                <ButtonLink href={listingHref(path, filters, sort, 'clear')} variant="secondary" size="sm">
                  Clear filters
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        {more.length > 0 && (
          <section aria-labelledby="about-category" className="mt-6 max-w-[46rem] border-t border-line pt-8">
            <h2 id="about-category" className="text-2xl">
              About {node.name.toLowerCase()}
            </h2>
            <div className="mt-3 flex flex-col gap-3 text-[16px] leading-relaxed text-body-dark">
              {more.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
