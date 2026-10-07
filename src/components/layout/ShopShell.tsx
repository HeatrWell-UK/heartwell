import type { ReactNode } from 'react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getShopNavigation, type NavSection } from '@/lib/catalogue/listing'
import { SHOP_LINKS } from '@/config/navigation'
import { Tracking } from '@/components/tracking/Tracking'
import { getTrackingSettings } from '@/lib/tracking/server'

/**
 * The storefront's frame: announcement bar, header, footer. #page is what the
 * menu drawer marks inert while it's open.
 */
export async function ShopShell({ children }: { children: ReactNode }) {
  const [nav, tracking] = await Promise.all([getShopNavigation().catch(() => [] as NavSection[]), getTrackingSettings()])
  const shop: NavSection[] = nav.length ? nav : [{ title: 'Shop sofas', links: SHOP_LINKS }]
  return (
    <div id="page" className="flex flex-1 flex-col">
      <AnnouncementBar />
      <Header shop={shop} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer shop={shop} />
      <Tracking mode={tracking.mode} />
    </div>
  )
}
