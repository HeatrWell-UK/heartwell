import type { ReactNode } from 'react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getShopNavigation, type NavSection } from '@/lib/catalogue/listing'
import { SHOP_LINKS } from '@/config/navigation'

/**
 * The storefront's frame: announcement bar, header, footer. #page is what the
 * menu drawer marks inert while it's open.
 */
export async function ShopShell({ children }: { children: ReactNode }) {
  const nav = await getShopNavigation().catch(() => [] as NavSection[])
  const shop: NavSection[] = nav.length ? nav : [{ title: 'Shop sofas', links: SHOP_LINKS }]
  return (
    <div id="page" className="flex flex-1 flex-col">
      <AnnouncementBar />
      <Header shop={shop} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer shop={shop} />
    </div>
  )
}
