// The product page's data, as plain serialisable objects: built on the server
// (src/lib/product/load.ts), handed to client components as props.

import type { SizeFields } from '@/lib/catalogue/display'
import type { Piece, Shape } from '@/lib/catalogue/clean'
import type { OfferTier } from '@/lib/offers/paid'

export interface VariantView {
  id: string
  sku: string
  colourName: string | null
  colourHex: string | null
  materialLabel: string | null
  priceAdjustment: number
  image: string | null
}

export interface FabricView {
  id: string
  code: string
  name: string
  hex: string | null
  image: string | null
}

export interface FabricCollectionView {
  slug: string
  name: string
  surcharge: number
  fabrics: FabricView[]
}

/** Another size or back style of the same range (the current product included). */
export interface SiblingView {
  slug: string
  axis1Value: string | null
  axis2Value: string | null
  basePrice: number
  madeToOrder: boolean
  variants: { sku: string; colourName: string | null; priceAdjustment: number }[]
}

export interface ProductCardView {
  slug: string
  title: string
  price: number
  image: string | null
  imageAlt: string
}

export interface ReviewView {
  name: string
  rating: number
  title: string | null
  comment: string | null
  date: string
}

export interface SpecRow {
  label: string
  value: string
}

export interface ProductPageData {
  id: string
  slug: string
  title: string
  typeSlug: string
  typeName: string
  basePrice: number
  madeToOrder: boolean
  madeInUk: boolean
  shape: Shape | null
  seats: number | null
  dimensions: SizeFields
  pieces: Piece[]
  dimensionsNote: string | null
  description: string | null
  highlights: string[]
  seoTitle: string | null
  seoDescription: string | null
  gallery: string[]
  specs: SpecRow[]
  /** Leather-look and other non-fabric covers get different care advice. */
  coverKind: 'fabric' | 'other'
  range: { slug: string; name: string; axis1Name: string; axis2Name: string | null } | null
  axis1Value: string | null
  axis2Value: string | null
  category: { slug: string; name: string; parent: { slug: string; name: string } | null } | null
  variants: VariantView[]
  siblings: SiblingView[]
  fabrics: FabricCollectionView[]
  related: ProductCardView[]
  reviews: ReviewView[]
  /** Active videos of this product (a customer’s, or the shop’s own). */
  videos: { mp4: string; poster: string; caption: string | null; fromCustomer: boolean }[]
  /** From every approved review (the list above shows the latest 20). Null until the first. */
  reviewStats: { count: number; average: number } | null
  /** Which offer amount this piece gets (Admin → product → offer tier). Null when it has none. */
  offerTier: OfferTier | null
}

export interface DeliveryInfo {
  /** "Tue 6 – Thu 8 October". */
  windowLabel: string
  minDays: number
  maxDays: number
  upstairsFirstFloor: number
  upstairsPerExtraFloor: number
  assemblyFee: number
  removalPerSeat: number
}
