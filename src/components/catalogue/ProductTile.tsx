import Image from 'next/image'
import Link from 'next/link'
import { ImageIcon } from '@phosphor-icons/react/ssr'
import { Price } from '@/components/ui/Price'
import { WhenNear } from '@/components/ui/WhenNear'
import { SaveButton } from '@/components/product/SaveButton'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { sizeLabel } from '@/lib/catalogue/range-sizes'
import { dealFor, dealLabel } from '@/lib/catalogue/deal'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

/** "5 seater corner, high back", "Armed U-shape". */
export function sizeLine(p: Pick<ListingProduct, 'axis1Value' | 'axis2Value'>): string | null {
  const parts = [p.axis1Value, p.axis2Value].filter((v): v is string => Boolean(v)).map(sizeLabel)
  if (parts.length === 0) return null
  return parts.map((part, i) => (i === 0 ? part : part.charAt(0).toLowerCase() + part.slice(1))).join(', ')
}

/**
 * A label only where it tells pieces apart (audit A3): nearly everything is
 * made to order, so that says nothing on a tile (the product page says it).
 * Ready-made pieces are the few that come with 14 days to change your mind.
 */
function badgeFor(p: ListingProduct): string | null {
  if (p.reclining === 'Electric') return 'Electric recliner'
  if (p.reclining) return 'Reclining'
  if (!p.madeToOrder) return 'Ready made'
  return null
}

/**
 * A product in a grid: photo in an arch like the home page's alcoves, with a
 * badge on its floor and the save heart beside its shoulder, the range's
 * name with the size underneath (said once), the price it starts from and its
 * colours. A piece on a deal shows its was-price struck through, and the
 * percentage off is its one label. `eager` for the first row, so the page's
 * main images load first; photos further down wait until they're near.
 */
export function ProductTile({ product: p, eager = false, defer = false }: { product: ListingProduct; eager?: boolean; defer?: boolean }) {
  const deal = dealFor(p.price, p.wasPrice)
  const badge = deal ? dealLabel(deal, formatPrice) : badgeFor(p)
  const size = sizeLine(p)
  // "Ashton" over "3+2 seater, high back" rather than "Ashton 3+2 Seater High Back" over the same words again.
  const name = p.rangeName && size ? p.rangeName : p.title
  const image = p.image && (
    <Image
      src={p.image}
      alt={p.imageAlt}
      fill
      loading={eager ? 'eager' : undefined}
      fetchPriority={eager ? 'high' : undefined}
      sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 47vw"
      className="object-cover"
    />
  )
  return (
    <div className="relative flex flex-col gap-2">
      <Link href={`/products/${p.slug}`} className="group flex flex-col gap-2 text-ink no-underline hover:text-ink">
        <span className="hw-niche hw-niche-square bg-stone">
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
            <span
              className={cn(
                'absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none shadow-sm',
                deal ? 'bg-gold-pale text-wine' : 'bg-white/95 text-velvet',
              )}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="flex flex-col gap-0.5 pt-0.5">
          <span className="font-display text-[20px] leading-[1.15] group-hover:text-velvet">{name}</span>
          {size && <span className="text-[14px] leading-snug text-slate">{size}</span>}
        </span>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="flex items-baseline gap-1.5">
          {p.colours.length > 1 && <span className="text-[13px] text-slate">from</span>}
          <Price amount={p.price} className="text-[19px]" />
          {deal && (
            <s className="font-display text-[15px] text-slate">
              <span className="sr-only">, was </span>
              {formatPrice(deal.was)}
            </s>
          )}
        </span>
        {p.colours.length > 0 && (
          <span className="flex items-center gap-1" aria-label={`Colours: ${p.colours.map((c) => c.name).join(', ')}`} role="img">
            {p.colours.slice(0, 4).map((c, i) => (
              <span key={`${c.name}-${i}`} className="size-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex ?? '#F5F1EF' }} />
            ))}
            {p.colours.length > 4 && <span className="text-[12px] text-slate">+{p.colours.length - 4}</span>}
          </span>
        )}
      </div>
      {/* In the corner beside the arch's shoulder. */}
      <SaveButton slug={p.slug} sku={null} noun={p.typeName.toLowerCase()} name={p.title} className="right-0 top-0 size-11 ring-1 ring-line" iconSize={18} />
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
