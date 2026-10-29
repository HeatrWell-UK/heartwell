import type { Metadata } from 'next'
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
import { getOfferSettings } from '@/lib/offers/server'
import { jsonLdString, organizationJsonLd, websiteJsonLd } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'

// Rebuilt at most every five minutes, so the delivery dates and featured ranges stay current.
export const revalidate = 300

// Title, description and share card come from the root layout.
export const metadata: Metadata = { alternates: { canonical: '/' } }

/**
 * The home page (docs/DESIGN.md, revision 4): the gallery of lit alcoves with
 * the promise and today's facts, what you pay and when, shapes, ranges,
 * fabrics, where we deliver and the showroom, then the questions people ask.
 */
export default async function HomePage() {
  const [tree, listing, fabrics, delivery, offers] = await Promise.all([
    getCategories(),
    getListing(),
    getFabricLibrary(),
    SUPABASE_CONFIGURED ? getDeliveryInfo() : Promise.resolve(null),
    getOfferSettings(),
  ])
  const sofas = tree.find((c) => c.slug === 'sofas' && c.parentId === null) ?? tree.find((c) => c.parentId === null)
  const fabricCount = fabrics.reduce((n, c) => n + c.fabrics.length, 0)
  const ranges = rangesFrom(listing)
  const windowLabel = delivery?.windowLabel ?? null

  return (
    <div className="pb-16 lg:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([organizationJsonLd(SITE_URL), websiteJsonLd(SITE_URL)]) }} />
      <Hero ranges={homeRanges(ranges, 4)} windowLabel={windowLabel} welcome={offers.welcome} />
      <HowPayingWorks windowLabel={windowLabel} />
      {sofas && <ShopByShape tree={tree} department={sofas} listing={listing} />}
      <OurRanges ranges={homeRanges(ranges, 9)} total={ranges.length} />
      <FabricStory collections={fabrics} />
      <DeliveryMap delivery={delivery} />
      <HomeFaq delivery={delivery} fabricCount={fabricCount} />
    </div>
  )
}
