import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { WhenNear } from '@/components/ui/WhenNear'
import { sentenceCase } from '@/lib/catalogue/listing'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { categoryHref, subtreeIds, type CategoryNode } from '@/lib/catalogue/tree'

/** Top-view plans of each shape (velvet line drawings, as designed). */
const PLANS: Record<string, ReactNode> = {
  'corner-sofas': (
    <>
      <path d="M8 8h56v14H24v18H8z" />
      <path d="M24 22v-4M40 8v14M52 8v14M8 28h16" />
    </>
  ),
  'u-shaped-sofas': (
    <>
      <path d="M6 8h60v32H52V22H20v18H6z" />
      <path d="M36 8v14M6 28h14M52 28h14" />
    </>
  ),
  '3-2-sofa-sets': (
    <>
      <rect x="4" y="14" width="36" height="16" rx="4" />
      <rect x="46" y="14" width="22" height="16" rx="4" />
      <path d="M16 14v16M28 14v16M57 14v16" />
    </>
  ),
  recliners: (
    <>
      <path d="M14 36V12a4 4 0 0 1 4-4h8v20h18" />
      <path d="M44 28l12 8h8" />
      <path d="M14 36h30" />
    </>
  ),
  'armchairs-and-footstools': (
    <>
      <rect x="6" y="10" width="28" height="26" rx="5" />
      <path d="M12 16h16v20" />
      <rect x="42" y="22" width="24" height="14" rx="4" />
    </>
  ),
}

const listFormat = new Intl.ListFormat('en-GB', { type: 'conjunction' })

function Plan({ slug }: { slug: string }) {
  return (
    <svg width="42" height="28" viewBox="0 0 72 48" fill="none" stroke="#8E1B2E" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" className="shrink-0">
      {PLANS[slug]}
    </svg>
  )
}

/**
 * The shape categories in the tree's order, each with the owner's photo and
 * its top-view plan, then a last tile for everything. Fabric and leather
 * aren't shapes, so they're named on that tile instead.
 */
export function ShopByShape({ tree, department, listing }: { tree: CategoryNode[]; department: CategoryNode; listing: ListingProduct[] }) {
  const shapes = tree.filter((c) => c.parentId === department.id && PLANS[c.slug]).sort((a, b) => a.sort - b.sort)
  if (shapes.length === 0) return null
  const countIn = (c: CategoryNode) => {
    const ids = subtreeIds(tree, c.id)
    return listing.filter((p) => p.categoryIds.some((id) => ids.has(id))).length
  }
  const others = tree.filter((c) => c.parentId === department.id && !PLANS[c.slug]).sort((a, b) => a.sort - b.sort)

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
                  <Plan slug={c.slug} />
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
