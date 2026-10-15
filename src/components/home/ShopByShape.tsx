import Image from 'next/image'
import Link from 'next/link'
import { WhenNear } from '@/components/ui/WhenNear'
import { ShapePlan, hasShapePlan } from '@/components/catalogue/ShapePlan'
import { sentenceCase } from '@/lib/catalogue/listing'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { categoryHref, subtreeIds, type CategoryNode } from '@/lib/catalogue/tree'

const listFormat = new Intl.ListFormat('en-GB', { type: 'conjunction' })

/**
 * The shape categories in the tree's order, each with the owner's photo and
 * its top-view plan, then a last tile for everything. Fabric and leather
 * aren't shapes, so they're named on that tile instead.
 */
export function ShopByShape({ tree, department, listing }: { tree: CategoryNode[]; department: CategoryNode; listing: ListingProduct[] }) {
  const shapes = tree.filter((c) => c.parentId === department.id && hasShapePlan(c.slug)).sort((a, b) => a.sort - b.sort)
  if (shapes.length === 0) return null
  const countIn = (c: CategoryNode) => {
    const ids = subtreeIds(tree, c.id)
    return listing.filter((p) => p.categoryIds.some((id) => ids.has(id))).length
  }
  const others = tree.filter((c) => c.parentId === department.id && !hasShapePlan(c.slug)).sort((a, b) => a.sort - b.sort)

  return (
    <section aria-labelledby="by-shape" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pt-14 lg:gap-8 lg:px-6 lg:pt-24">
      <h2 id="by-shape" className="text-[30px] leading-tight lg:text-[42px]">
        Shop by shape
      </h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
        {shapes.map((c) => {
          const n = countIn(c)
          return (
            <li key={c.id}>
              <Link href={categoryHref(tree, c)} className="group flex flex-col gap-3 text-ink no-underline hover:text-ink">
                <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-stone">
                  {c.imageUrl && (
                    <WhenNear className="absolute inset-0">
                      <Image src={c.imageUrl} alt="" fill sizes="(min-width: 1200px) 180px, (min-width: 1024px) 15vw, (min-width: 640px) 31vw, 47vw" className="object-cover" />
                    </WhenNear>
                  )}
                </span>
                <span className="flex items-center gap-2.5">
                  <ShapePlan slug={c.slug} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[16px] font-semibold leading-snug group-hover:text-velvet">{sentenceCase(c.name)}</span>
                    {n > 0 && <span className="text-[13px] text-slate">{n} to choose from</span>}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
        <li>
          <Link
            href={categoryHref(tree, department)}
            className="flex aspect-square flex-col justify-end gap-2 rounded-[18px] bg-wine p-4 text-white no-underline hover:bg-wine-deep hover:text-white lg:p-5"
          >
            <span className="text-gold-lit font-display text-[26px] leading-[1.1] lg:text-[28px]">
              All {countIn(department)} {department.name.toLowerCase()}
            </span>
            {others.length > 0 && (
              <span className="text-[14px] leading-snug text-on-wine">
                Including {listFormat.format(others.map((c) => c.name.toLowerCase()))}
              </span>
            )}
          </Link>
        </li>
      </ul>
    </section>
  )
}
