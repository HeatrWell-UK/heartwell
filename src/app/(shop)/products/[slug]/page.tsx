import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ProductPurchase, type PurchaseProduct, type SizePlans } from '@/components/product/ProductPurchase'
import { PostcodeCheck } from '@/components/product/PostcodeCheck'
import { PromiseRows } from '@/components/product/PromiseRows'
import { FitPanel } from '@/components/product/FitPanel'
import { ProductDetails } from '@/components/product/ProductDetails'
import { Reviews } from '@/components/product/Reviews'
import { Videos } from '@/components/product/Videos'
import { RelatedRail } from '@/components/product/ProductCard'
import { CONTACT, whatsAppHref } from '@/config/contact'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { SITE_URL } from '@/config/site'
import { OPEN_GRAPH_BASE } from '@/config/brand'
import { QuestionList } from '@/components/content/QuestionList'
import { productQuestions } from '@/lib/seo/answers'
import { getDeliveryInfo, getProductPage } from '@/lib/product/load'
import { getCategories, getListing, sentenceCase } from '@/lib/catalogue/listing'
import { categoryHref, trail } from '@/lib/catalogue/tree'
import { pickFabric, pickVariant } from '@/lib/product/helpers'
import { breadcrumbJsonLd, jsonLdString, productDescription, productJsonLd, shareImageUrl } from '@/lib/product/seo'
import type { ProductPageData } from '@/lib/product/types'
import { tierAmount } from '@/lib/offers/paid'
import { getOfferSettings, shopOffers } from '@/lib/offers/server'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ variant?: string | string[]; fabric?: string | string[] }>
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Only what the interactive part needs, so the page sends the browser no more than that. */
function purchaseProps(p: ProductPageData): PurchaseProduct {
  const { id, slug, title, typeName, basePrice, wasPrice, madeToOrder, madeInUk, variants, siblings, fabrics, gallery, range, offerTier, axis1Value, axis2Value } = p
  return { id, slug, title, typeName, basePrice, wasPrice, madeToOrder, madeInUk, variants, siblings, fabrics, gallery, range, offerTier, axis1Value, axis2Value }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductPage(slug)
  if (!product) return {}
  const variant = pickVariant(product.variants, first((await searchParams).variant))
  const image = shareImageUrl(variant?.image ?? product.gallery[0] ?? null)
  const title = product.seoTitle ?? product.title
  const description = productDescription(product)
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title,
      description,
      url: `/products/${product.slug}`,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: variant?.colourName ? `${product.title} in ${variant.colourName}` : product.title }] } : {}),
    },
  }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params
  const [product, delivery, query, tree, offers, listing] = await Promise.all([
    getProductPage(slug),
    getDeliveryInfo(),
    searchParams,
    getCategories(),
    getOfferSettings(),
    getListing(),
  ])
  if (!product) notFound()

  const variant = pickVariant(product.variants, first(query.variant))
  const fabric = product.madeToOrder ? pickFabric(product.fabrics, first(query.fabric)) : null
  const noun = product.typeName.toLowerCase()
  const name = product.range?.name ?? product.title

  const question = `Hi Heartwell, I have a question about the ${product.title}: ${SITE_URL}/products/${product.slug}`
  // Plain links for the small "ask us" notes; the reviews block gets the full WhatsApp button.
  const askHref = whatsAppHref(question) ?? `mailto:${CONTACT.email}?subject=${encodeURIComponent(product.title)}`
  const ask = CONTACT.whatsAppNumber ? (
    <WhatsAppButton message={question} context="product-reviews" productId={product.id} productName={product.title}>
      Ask us anything on WhatsApp
    </WhatsAppButton>
  ) : (
    <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(product.title)}`}>Ask us anything by email</a>
  )

  const categoryNode = product.category ? tree.find((c) => c.slug === product.category?.slug) : undefined
  const crumbs = categoryNode ? trail(tree, categoryNode).map((c) => ({ name: sentenceCase(c.name), href: categoryHref(tree, c) })) : []

  // Each size's top view, from the listing (already cached), for the size cards.
  const plans: SizePlans = Object.fromEntries(
    product.siblings.map((s) => {
      const listed = listing.find((l) => l.slug === s.slug)
      return [s.slug, { plan: listed?.plan ?? null, seats: listed?.seats ?? null }]
    }),
  )

  return (
    <article className="pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([
            productJsonLd(product, SITE_URL),
            breadcrumbJsonLd([...crumbs.map((c) => ({ name: c.name, path: c.href })), { name: product.title, path: `/products/${product.slug}` }], SITE_URL),
          ]),
        }}
      />
      <Breadcrumbs items={crumbs} />

      <ProductPurchase
        product={purchaseProps(product)}
        initialVariantId={variant?.id ?? null}
        initialFabric={fabric}
        adAmount={tierAmount(product.offerTier, offers.amounts)}
        offers={shopOffers(offers)}
        plans={plans}
      >
        <PostcodeCheck windowLabel={delivery.windowLabel} areas={delivery.areas} noDeliveryDays={delivery.noDeliveryDays} />
        <PromiseRows madeToOrder={product.madeToOrder} />
      </ProductPurchase>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 pt-10 lg:gap-20 lg:px-6 lg:pt-20">
        <FitPanel
          shape={product.shape}
          noun={noun}
          dimensions={product.dimensions}
          pieces={product.pieces}
          note={product.dimensionsNote}
          askHref={askHref}
        />
        <div className="flex flex-col gap-12 px-4 lg:grid lg:grid-cols-[6fr_5fr] lg:gap-16 lg:px-0">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-4">
              <h2 className="text-[28px] leading-tight lg:text-[36px]">About {name}</h2>
              <ProductDetails product={product} delivery={delivery} />
            </div>
            {/* The questions people search for, answered from this piece's own details (docs/KEYWORDS.md). */}
            <QuestionList
              id="questions"
              title={`Questions about the ${name}`}
              items={productQuestions(product, { delivery, fabricCount: product.fabrics.reduce((n, c) => n + c.fabrics.length, 0) })}
            />
          </div>
          <div className="flex flex-col gap-10">
            <Videos videos={product.videos} title={product.title} />
            <Reviews reviews={product.reviews} stats={product.reviewStats} name={name} ask={ask} />
          </div>
        </div>
        <RelatedRail title="You might also like" products={product.related} />
      </div>
    </article>
  )
}
