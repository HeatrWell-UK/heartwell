import { Hero } from '@/components/home/Hero'
import { HowPayingWorks } from '@/components/home/HowPayingWorks'
import { ShopByShape } from '@/components/home/ShopByShape'
import { OurRanges } from '@/components/home/OurRanges'
import { FabricStory } from '@/components/home/FabricStory'
import { DeliveryMap } from '@/components/home/DeliveryMap'
import { HomeFaq } from '@/components/home/HomeFaq'
import { getCategories, getFabricLibrary, getListing, rangesFrom } from '@/lib/catalogue/listing'
import { homeRanges } from '@/lib/home/picks'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { getDeliveryInfo } from '@/lib/product/load'
import { jsonLdString, organizationJsonLd } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'

// Rebuilt at most every five minutes, so the delivery dates and featured ranges stay current.
export const revalidate = 300

/**
 * The home page (docs/DESIGN.md, revision 3): the owner's room with the promise
 * lit in its alcove, how paying works, shapes, ranges, fabrics, where we
 * deliver and the showroom, then the questions people ask.
 */
export default async function HomePage() {
  const [tree, listing, fabrics, delivery] = await Promise.all([
    getCategories(),
    getListing(),
    getFabricLibrary(),
    SUPABASE_CONFIGURED ? getDeliveryInfo() : Promise.resolve(null),
  ])
  const sofas = tree.find((c) => c.slug === 'sofas' && c.parentId === null) ?? tree.find((c) => c.parentId === null)
  const fabricCount = fabrics.reduce((n, c) => n + c.fabrics.length, 0)
  const ranges = rangesFrom(listing)

  return (
    <div className="pb-16 lg:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd(SITE_URL)) }} />
      <Hero />
      <HowPayingWorks />
      {sofas && <ShopByShape tree={tree} department={sofas} listing={listing} />}
      <OurRanges ranges={homeRanges(ranges)} total={ranges.length} />
      <FabricStory collections={fabrics} />
      <DeliveryMap windowLabel={delivery?.windowLabel ?? null} />
      <HomeFaq delivery={delivery} fabricCount={fabricCount} />
    </div>
  )
}
