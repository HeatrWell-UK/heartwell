import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from '@phosphor-icons/react/ssr'
import { Price } from '@/components/ui/Price'
import { WhenNear } from '@/components/ui/WhenNear'
import { SaveButton } from '@/components/product/SaveButton'
import type { ListingProduct } from '@/lib/catalogue/listing-types'

/** "5 seater corner · high back". */
export function sizeLine(p: Pick<ListingProduct, 'axis1Value' | 'axis2Value'>): string | null {
  const text = [p.axis1Value, p.axis2Value].filter(Boolean).join(' · ').toLowerCase()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null
}

function badgeFor(p: ListingProduct): string | null {
  if (p.reclining === 'Electric') return 'Electric recliner'
  if (p.reclining) return 'Reclining'
  if (p.madeToOrder) return 'Made to order'
  return null
}

/**
 * A product in a grid: photo with a badge and the save heart, name, size, the
 * price it starts from and its colours. `eager` for the first row, so the
 * page's main images load first; photos further down wait until they're near.
 */
export function ProductTile({ product: p, eager = false, defer = false }: { product: ListingProduct; eager?: boolean; defer?: boolean }) {
  const badge = badgeFor(p)
  const size = sizeLine(p)
  const image = p.image && (
    <Image
      src={p.image}
      alt={p.imageAlt}
      fill
      priority={eager}
      sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 47vw"
      className="object-cover"
    />
  )
  return (
    <div className="relative flex flex-col gap-2">
      <Link href={`/products/${p.slug}`} className="flex flex-col gap-2 text-ink no-underline hover:text-ink">
        <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-stone">
          {image ? (
            defer ? (
              <WhenNear className="absolute inset-0">{image}</WhenNear>
            ) : (
              image
            )
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 text-[13px] text-slate">
              <ImageIcon aria-hidden="true" size={28} />
              Photo coming soon
            </span>
          )}
          {badge && (
            <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold leading-none text-velvet">{badge}</span>
          )}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold leading-snug">{p.title}</span>
          {size && <span className="text-[13px] text-slate">{size}</span>}
        </span>
      </Link>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-1.5">
          {p.colours.length > 1 && <span className="text-[13px] text-slate">from</span>}
          <Price amount={p.price} className="text-lg" />
        </span>
        {p.colours.length > 0 && (
          <span className="flex items-center gap-1" aria-label={`Colours: ${p.colours.map((c) => c.name).join(', ')}`} role="img">
            {p.colours.slice(0, 4).map((c) => (
              <span key={c.name} className="size-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex ?? '#F5F1EF' }} />
            ))}
            {p.colours.length > 4 && <span className="text-[12px] text-slate">+{p.colours.length - 4}</span>}
          </span>
        )}
      </div>
      <SaveButton slug={p.slug} sku={null} noun={p.typeName.toLowerCase()} name={p.title} className="right-1 top-1 size-11" iconSize={18} />
    </div>
  )
}

export function ProductGrid({ products, eagerCount = 2 }: { products: ListingProduct[]; eagerCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
      {products.map((p, i) => (
        <li key={p.slug}>
          <ProductTile product={p} eager={i < eagerCount} defer={i >= 6} />
        </li>
      ))}
    </ul>
  )
}
