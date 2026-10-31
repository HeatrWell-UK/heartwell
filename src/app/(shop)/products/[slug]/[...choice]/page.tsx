import { NO_VARIANT, ProductPage, productMetadata, type ProductChoice } from '@/components/product/ProductPage'
import { getFeedProducts } from '@/lib/catalogue/feed-load'

// A product opened on a colourway or a fabric: /products/<slug>?variant=<sku>
// (catalogue ads, size links, shared links) and &fabric=<code>, which the proxy
// serves from here as /products/<slug>/<sku>[/<fabric>] (audit A4). Cached like
// the plain page, every colourway built ahead; fabrics are built on their first
// visit. The address people see, and the canonical link, stay the plain ones.
export const revalidate = 300

export async function generateStaticParams() {
  return (await getFeedProducts()).flatMap((p) => p.variants.map((v) => ({ slug: p.slug, choice: [v.sku] })))
}

type Props = { params: Promise<{ slug: string; choice: string[] }> }

async function choiceOf(params: Props['params']): Promise<ProductChoice> {
  const { slug, choice } = await params
  const [variant, fabric] = choice
  return { slug, variant: variant && variant !== NO_VARIANT ? variant : null, fabric: fabric ?? null }
}

export async function generateMetadata({ params }: Props) {
  return productMetadata(await choiceOf(params))
}

export default async function ProductChoiceRoute({ params }: Props) {
  return <ProductPage {...await choiceOf(params)} />
}
