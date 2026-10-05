import Link from 'next/link'
import type { ReactNode } from 'react'
import { sentenceCase } from '@/lib/catalogue/listing'
import { categoryHref, type CategoryNode } from '@/lib/catalogue/tree'

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

/** The shape categories, in the tree's order. Categories without a plan (fabric, leather) aren't shapes. */
export function ShopByShape({ tree, department }: { tree: CategoryNode[]; department: CategoryNode }) {
  const shapes = tree.filter((c) => c.parentId === department.id && PLANS[c.slug]).sort((a, b) => a.sort - b.sort)
  if (shapes.length === 0) return null
  return (
    <section aria-labelledby="by-shape" className="mx-auto flex max-w-[1200px] flex-col gap-4 pt-10 lg:px-6 lg:pt-16">
      <div className="flex items-baseline justify-between gap-4 px-4 lg:px-0">
        <h2 id="by-shape" className="text-[28px] leading-tight lg:text-[34px]">
          Shop by shape
        </h2>
        <Link href={categoryHref(tree, department)} className="text-[15px] font-semibold">
          All {department.name.toLowerCase()}
        </Link>
      </div>
      <ul className="no-scrollbar flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0">
        {shapes.map((c) => (
          <li key={c.id} className="w-[136px] shrink-0 snap-start lg:w-auto">
            <Link
              href={categoryHref(tree, c)}
              className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] bg-stone p-4 text-ink no-underline hover:text-ink hover:outline hover:outline-1 hover:outline-velvet"
            >
              <svg width="72" height="48" viewBox="0 0 72 48" fill="none" stroke="#8E1B2E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                {PLANS[c.slug]}
              </svg>
              <span className="text-[15px] font-semibold leading-snug">{sentenceCase(c.name)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
