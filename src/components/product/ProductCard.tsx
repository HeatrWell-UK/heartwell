import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from '@phosphor-icons/react/ssr'
import { Price } from '@/components/ui/Price'
import { WhenNear } from '@/components/ui/WhenNear'
import type { ProductCardView } from '@/lib/product/types'
import { dealFor, dealLabel } from '@/lib/catalogue/deal'
import { formatPrice } from '@/lib/format'

/** A product in a rail or grid: photo, name and price (with its was-price when it's on a deal). */
export function ProductCard({ product }: { product: ProductCardView }) {
  const deal = dealFor(product.price, product.wasPrice)
  return (
    <Link href={`/products/${product.slug}`} className="flex flex-col gap-2 text-ink no-underline hover:text-ink">
      <span className="hw-niche hw-niche-square bg-stone">
        {product.image ? (
          // Fixed width: one 1× and one 2× file (168 px on phones, 270 px in the desktop grid).
          <WhenNear className="block size-full">
            <Image src={product.image} alt={product.imageAlt} width={270} height={270} className="size-full object-cover" />
          </WhenNear>
        ) : (
          <span className="flex h-full items-center justify-center text-slate">
            <ImageIcon aria-hidden="true" size={32} />
          </span>
        )}
      </span>
      <span className="text-[15px] font-semibold leading-snug">{product.title}</span>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <Price amount={product.price} className="text-lg" />
        {deal && (
          <>
            <s className="font-display text-[15px] text-slate">
              <span className="sr-only">, was </span>
              {formatPrice(deal.was)}
            </s>
            <span className="text-[13px] font-semibold text-wine">{dealLabel(deal, formatPrice)}</span>
          </>
        )}
      </span>
    </Link>
  )
}

export function RelatedRail({ title, products }: { title: string; products: ProductCardView[] }) {
  if (products.length === 0) return null
  return (
    <section aria-labelledby="related" className="flex flex-col gap-3.5">
      <h2 id="related" className="px-4 text-[28px] leading-tight lg:px-0 lg:text-[36px]">
        {title}
      </h2>
      <ul className="no-scrollbar flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
        {products.map((p) => (
          <li key={p.slug} className="w-[168px] shrink-0 snap-start lg:w-auto">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}
