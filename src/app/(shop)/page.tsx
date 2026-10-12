import { Hero } from '@/components/home/Hero'
import { PromiseTiles } from '@/components/home/PromiseTiles'
import { HowOrderingWorks } from '@/components/home/HowOrderingWorks'
import { ShopByShape } from '@/components/home/ShopByShape'
import { PopularNow, pickPopular } from '@/components/home/PopularNow'
import { FabricStory } from '@/components/home/FabricStory'
import { FirstTime } from '@/components/home/FirstTime'
import { VisitUs } from '@/components/home/VisitUs'
import { CONTACT } from '@/config/contact'
import { HomeFaq } from '@/components/home/HomeFaq'
import { getCategories, getFabricLibrary, getListing } from '@/lib/catalogue/listing'
import { categoryHref } from '@/lib/catalogue/tree'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { getDeliveryInfo } from '@/lib/product/load'
import { jsonLdString, organizationJsonLd } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'

// Rebuilt at most every five minutes, so the delivery dates and featured sofas stay current.
export const revalidate = 300

export default async function HomePage() {
  const [tree, listing, fabrics, delivery] = await Promise.all([
    getCategories(),
    getListing(),
    getFabricLibrary(),
    SUPABASE_CONFIGURED ? getDeliveryInfo() : Promise.resolve(null),
  ])
  const sofas = tree.find((c) => c.slug === 'sofas' && c.parentId === null) ?? tree.find((c) => c.parentId === null)
  const fabricCount = fabrics.reduce((n, c) => n + c.fabrics.length, 0)

  return (
    <div className="pb-14 lg:pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd(SITE_URL)) }} />
      <Hero />
      <PromiseTiles />
      <HowOrderingWorks />
      {sofas && <ShopByShape tree={tree} department={sofas} />}
      <PopularNow products={pickPopular(listing)} allHref={sofas ? categoryHref(tree, sofas) : '/search'} allLabel={`Shop all ${listing.length} pieces`} />
      <FabricStory collections={fabrics} />
      <FirstTime />
      {/* Shown only while there’s an address to visit (src/config/contact.ts). */}
      {CONTACT.visitAddress && (
        <div className="mx-auto max-w-[1200px] px-4 pt-12 lg:px-6 lg:pt-20">
          <div className="max-w-[46rem]">
            <VisitUs />
          </div>
        </div>
      )}
      <HomeFaq delivery={delivery} fabricCount={fabricCount} />
    </div>
  )
}
