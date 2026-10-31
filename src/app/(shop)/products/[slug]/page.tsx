import { ProductPage, productMetadata } from '@/components/product/ProductPage'
import { getListing } from '@/lib/catalogue/listing'

// A product, cached (audit A4): every piece is built ahead and rebuilt at most
// every five minutes; one added later is built on its first visit. A colourway
// or fabric in the address (?variant=, ?fabric=) is served by the colourway
// route next door (src/proxy.ts), cached the same way.
export const revalidate = 300

export async function generateStaticParams() {
  return (await getListing()).map((p) => ({ slug: p.slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  return productMetadata({ slug: (await params).slug, variant: null, fabric: null })
}

export default async function ProductRoute({ params }: Props) {
  return <ProductPage slug={(await params).slug} variant={null} fabric={null} />
}
