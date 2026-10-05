// One product as category pages, search and the home page see it.

export interface ListingProduct {
  slug: string
  title: string
  typeSlug: string
  typeName: string
  /** Filter keys the product's type offers (product_types.filters). */
  typeFilters: string[]
  rangeSlug: string | null
  rangeName: string | null
  rangeSort: number
  sort: number
  featured: boolean
  madeToOrder: boolean
  madeInUk: boolean
  price: number
  widthCm: number | null
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
