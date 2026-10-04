import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from '@phosphor-icons/react/ssr'
import { Price } from '@/components/ui/Price'
import type { ProductCardView } from '@/lib/product/types'

/** A product in a rail or grid: photo, name and price. */
export function ProductCard({ product, sizes = '168px' }: { product: ProductCardView; sizes?: string }) {
  return (
    <Link href={`/products/${product.slug}`} className="flex flex-col gap-2 text-ink no-underline hover:text-ink">
      <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-stone">
        {product.image ? (
          <Image src={product.image} alt={product.imageAlt} fill sizes={sizes} className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate">
            <ImageIcon aria-hidden="true" size={32} />
          </span>
        )}
      </span>
      <span className="text-[15px] font-semibold leading-snug">{product.title}</span>
      <Price amount={product.price} className="text-lg" />
    </Link>
  )
}

export function RelatedRail({ title, products }: { title: string; products: ProductCardView[] }) {
  if (products.length === 0) return null
  return (
    <section aria-labelledby="related" className="flex flex-col gap-3.5">
      <h2 id="related" className="px-4 text-2xl lg:px-0">
        {title}
      </h2>
      <ul className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
        {products.map((p) => (
          <li key={p.slug} className="w-[168px] shrink-0 snap-start lg:w-auto">
            <ProductCard product={p} sizes="(min-width: 1024px) 270px, 168px" />
          </li>
        ))}
      </ul>
    </section>
  )
}
