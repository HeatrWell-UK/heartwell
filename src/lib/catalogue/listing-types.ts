// One product as category pages, search and the home page see it.

import type { Layout } from '@/lib/product/measurements'

export interface ListingProduct {
  slug: string
  title: string
  typeSlug: string
  typeName: string
  /** Filter keys the product's type offers (product_types.filters). */
  typeFilters: string[]
  rangeSlug: string | null
  rangeName: string | null
  /** The range's introduction (ranges.description), for its range page. */
  rangeDescription: string | null
  rangeSort: number
  sort: number
  featured: boolean
  madeToOrder: boolean
  madeInUk: boolean
  price: number
  widthCm: number | null
  /** Front to back, and height, in centimetres (for range pages' measurement answers). */
  depthCm: number | null
  heightCm: number | null
  /** Its top view in centimetres, for drawings to scale; null when the measurements aren't known. */
  plan: Layout | null
  shape: string | null
  seats: number | null
  material: string | null
  reclining: string | null
  axis1Value: string | null
  axis2Value: string | null
  categoryIds: string[]
  image: string | null
  imageAlt: string
  colours: { name: string; hex: string | null }[]
}
