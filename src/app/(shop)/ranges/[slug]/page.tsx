import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ProductGrid } from '@/components/catalogue/ProductTile'
import { formatPrice } from '@/lib/format'
import { getFabricLibrary, getListing, rangesFrom } from '@/lib/catalogue/listing'
import { breadcrumbJsonLd, jsonLdString } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

/** Every range is built ahead and refreshed every five minutes; a new range is built on its first visit. */
export async function generateStaticParams() {
  return rangesFrom(await getListing()).map((r) => ({ slug: r.slug }))
}

async function findRange(slug: string) {
  return rangesFrom(await getListing()).find((r) => r.slug === slug) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const range = await findRange((await params).slug)
  if (!range) return {}
  return {
    title: `${range.name} sofas`,
    description: `The ${range.name} range at Heartwell: ${range.products.length} sizes from ${formatPrice(range.price)}${range.madeToOrder ? ', made to order in your choice of fabric' : ''}. Free UK Mainland delivery, pay on delivery.`,
    alternates: { canonical: `/ranges/${range.slug}` },
  }
}

export default async function RangePage({ params }: Props) {
  const [range, fabrics] = await Promise.all([findRange((await params).slug), getFabricLibrary()])
  if (!range) notFound()

  const fabricCount = fabrics.reduce((n, c) => n + c.fabrics.length, 0)
  // Ranges with two back styles are shown as two groups.
  const styles = [...new Set(range.products.map((p) => p.axis2Value).filter((v): v is string => Boolean(v)))]
  const groups = styles.length > 1 ? styles.map((s) => ({ title: s, products: range.products.filter((p) => p.axis2Value === s) })) : [{ title: null, products: range.products }]

  return (
    <div className="pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd([{ name: 'Ranges', path: '/ranges' }, { name: range.name, path: `/ranges/${range.slug}` }], SITE_URL)) }}
      />
      <Breadcrumbs items={[{ name: 'Ranges', href: '/ranges' }]} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pt-2 lg:px-6 lg:pt-4">
        <header className="flex flex-col gap-3">
          <h1 className="text-[32px] leading-tight lg:text-[44px]">The {range.name} range</h1>
          <p className="max-w-[46rem] text-[17px] leading-relaxed text-slate">
            {range.products.length} {range.products.length === 1 ? 'piece' : 'pieces'}, from {formatPrice(range.price)}.{' '}
            {range.madeToOrder && fabricCount > 0
              ? `Made to order in the colours shown or any of our ${fabricCount} fabrics.`
              : 'In the colours shown.'}
          </p>
          {range.colours.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Colours">
              {range.colours.map((c) => (
                <li key={c.name} className="flex items-center gap-1.5 text-[15px]">
                  <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex ?? '#F5F1EF' }} />
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </header>
        {groups.map((g, i) => (
          <section key={g.title ?? 'all'} aria-label={g.title ?? `${range.name} sizes`} className="flex flex-col gap-4">
            {g.title && <h2 className="text-2xl">{g.title}</h2>}
            <ProductGrid products={g.products} eagerCount={i === 0 ? 2 : 0} />
          </section>
        ))}
      </div>
    </div>
  )
}
