import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ButtonLink } from '@/components/ui/Button'
import { VelvetHeader } from './VelvetHeader'
import { CatalogueControls, FilterPanel } from './CatalogueControls'
import { ProductGrid } from './ProductTile'
import { ShapePlan } from './ShapePlan'
import { ShapeRail } from './ShapeRail'
import { formatPrice } from '@/lib/format'
import Link from 'next/link'
import { getCategories, getFabricLibrary, getListing, sentenceCase } from '@/lib/catalogue/listing'
import { QuestionList } from '@/components/content/QuestionList'
import { categoryGuides, categoryQuestions } from '@/content/categories'
import { getDeliveryInfo } from '@/lib/product/load'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { activeChips, applyFilters, facetsFor, hasFilters, listingHref, parseListing, sortProducts } from '@/lib/catalogue/filters'
import { categoryHref, resolveCategory, subtreeIds, trail } from '@/lib/catalogue/tree'
import { breadcrumbJsonLd, jsonLdString } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'

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
  const [{ department, category }, query, tree, listing, fabrics, delivery] = await Promise.all([
    params,
    searchParams,
    getCategories(),
    getListing(),
    getFabricLibrary(),
    SUPABASE_CONFIGURED ? getDeliveryInfo().catch(() => null) : Promise.resolve(null),
  ])
  const node = resolveCategory(tree, department, category)
  if (!node) notFound()

  const path = categoryHref(tree, node)
  const inside = subtreeIds(tree, node.id)
  const products = listing.filter((p) => p.categoryIds.some((id) => inside.has(id)))
  const { filters, sort } = parseListing(query)
  const shown = sortProducts(applyFilters(products, filters), sort)
  const facets = facetsFor(products, filters)
  const chips = activeChips(path, filters, sort)
  const crumbs = trail(tree, node)
    .slice(0, -1)
    .map((c) => ({ name: sentenceCase(c.name), href: categoryHref(tree, c) }))
  const [intro, ...more] = paragraphs(node.description)
  const noun = products.every((p) => p.typeSlug === 'sofa') ? 'sofa' : 'piece'
  const controls = { path, facets, filters, sort, chips, count: shown.length, noun }
  const from = products.length ? Math.min(...products.map((p) => p.price)) : null
  const title = sentenceCase(node.name)
  const titleInSentence = /^[A-Z]-/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1)
  // Answers to what people search for about this kind of sofa (src/content/categories.ts).
  const children = tree
    .filter((c) => c.parentId === node.id)
    .map((c) => {
      const ids = subtreeIds(tree, c.id)
      const inside = products.filter((p) => p.categoryIds.some((id) => ids.has(id)))
      return { name: sentenceCase(c.name), href: categoryHref(tree, c), count: inside.length, from: inside.length ? Math.min(...inside.map((p) => p.price)) : 0 }
    })
    .filter((c) => c.count > 0)
  const questions = categoryQuestions(node.slug, { products, delivery, fabricCount: fabrics.reduce((n, c) => n + c.fabrics.length, 0), children })
  const guides = categoryGuides(node.slug)

  return (
    <div className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd([...crumbs.map((c) => ({ name: c.name, path: c.href })), { name: title, path }], SITE_URL)) }}
      />
      <WhatsAppTopic message={`Hi Heartwell, I'm looking at your ${titleInSentence} and have a question: ${SITE_URL}${path}`} context="sticky-category" />
      <VelvetHeader
        crumbs={crumbs}
        title={title}
        intro={intro}
        photo={node.imageUrl}
        aside={<ShapePlan slug={node.slug} width={132} className="mb-2 hidden shrink-0 text-gold-pale lg:block" />}
      >
        {from !== null && (
          <p className="text-[16px] text-on-wine lg:text-[17px]">
            {products.length} {products.length === 1 ? noun : `${noun}s`}, from <span className="font-semibold text-white">{formatPrice(from)}</span>
          </p>
        )}
      </VelvetHeader>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-5 lg:gap-7 lg:px-6 lg:pt-8">
        <ShapeRail tree={tree} node={node} />

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
                <ButtonLink href={listingHref(path, filters, sort, 'clear')} variant="secondary" size="sm">
                  Clear filters
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        {(more.length > 0 || intro) && (
          <section aria-labelledby="about-category" className={`mt-8 max-w-[46rem] border-t border-line pt-8 ${more.length === 0 ? 'lg:hidden' : ''}`}>
            <h2 id="about-category" className="text-[26px] leading-tight lg:text-[30px]">
              About {titleInSentence}
            </h2>
            <div className="mt-3 flex flex-col gap-3 text-[16px] leading-relaxed text-body-dark">
              {intro && <p className="lg:hidden">{intro}</p>}
              {more.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </section>
        )}

        <QuestionList id="category-questions" title={`Questions about ${titleInSentence}`} items={questions} structured className="mt-8 max-w-[46rem]" />

        {guides.length > 0 && (
          <nav aria-labelledby="category-guides" className="flex max-w-[46rem] flex-col gap-3 border-t border-line pt-8">
            <h2 id="category-guides" className="text-[22px] leading-tight lg:text-[26px]">
              Guides
            </h2>
            <ul className="flex flex-col gap-2 text-[16px]">
              {guides.map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="font-semibold">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  )
}
