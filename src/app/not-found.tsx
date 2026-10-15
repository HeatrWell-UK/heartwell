import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/Button'
import { ShopShell } from '@/components/layout/ShopShell'
import { EmptyAlcove } from '@/components/content/EmptyAlcove'
import { SearchBox } from '@/components/catalogue/SearchBox'
import { ShapeRail } from '@/components/catalogue/ShapeRail'
import { getCategories } from '@/lib/catalogue/listing'

export const metadata: Metadata = { title: 'Page not found' }

// Rendered inside the root layout only, so it brings the shop's frame itself.
// A dead end that still leads somewhere: search, the shapes, home and a person.
export default async function NotFound() {
  const tree = await getCategories().catch(() => [])
  const department = tree.find((c) => c.slug === 'sofas' && c.parentId === null) ?? tree.find((c) => c.parentId === null)
  return (
    <ShopShell>
      <section className="mx-auto flex max-w-[46rem] flex-col items-start gap-6 px-4 py-12 lg:py-20">
        <EmptyAlcove />
        <div className="flex flex-col gap-3">
          <h1 className="text-[38px] leading-[1.06] lg:text-[56px]">We can&rsquo;t find that page</h1>
          <p className="text-[17px] leading-relaxed text-slate lg:text-lg">
            It may have moved, or the link may be wrong. Search for what you were after, or pick a shape.
          </p>
        </div>
        <SearchBox />
        {/* Full width, so the row scrolls inside the screen instead of widening the page (this column aligns to the start). */}
        {department && (
          <div className="w-full">
            <ShapeRail tree={tree} node={null} department={department} alwaysTop />
          </div>
        )}
        <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row">
          <ButtonLink href="/" block className="sm:w-auto">
            Go to the home page
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary" block className="sm:w-auto">
            Contact us
          </ButtonLink>
        </div>
      </section>
    </ShopShell>
  )
}
