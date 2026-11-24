import type { ReactNode } from 'react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getShopNavigation, type NavSection } from '@/lib/catalogue/listing'
import { SHOP_LINKS } from '@/config/navigation'
import { Tracking } from '@/components/tracking/Tracking'
import { JourneyTracker } from '@/components/tracking/JourneyTracker'
import { getTrackingSettings } from '@/lib/tracking/server'
import { OfferCapture } from '@/components/offer/OfferCapture'
import { getOfferSettings } from '@/lib/offers/server'
import { FloatingWhatsApp } from '@/components/whatsapp/FloatingWhatsApp'
import { WhatsAppHelp } from '@/components/whatsapp/WhatsAppHelp'
import { SeasonProvider } from '@/components/season/SeasonContext'
import { OfferSheet } from '@/components/season/OfferSheet'

/**
 * The storefront's frame: announcement bar, header, footer and the floating
 * WhatsApp button. #page is what the menu drawer marks inert while it's open.
 * The season's settings reach every client part through SeasonProvider (Run 3).
 */
export async function ShopShell({ children }: { children: ReactNode }) {
  const [nav, tracking, offers] = await Promise.all([getShopNavigation().catch(() => [] as NavSection[]), getTrackingSettings(), getOfferSettings()])
  const shop: NavSection[] = nav.length ? nav : [{ title: 'Shop sofas', links: SHOP_LINKS }]
  return (
    <SeasonProvider event={offers.event}>
      <div id="page" className="flex flex-1 flex-col">
        <AnnouncementBar event={offers.event} />
        <Header shop={shop} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer shop={shop} />
        <FloatingWhatsApp />
        <WhatsAppHelp />
        <Tracking mode={tracking.mode} />
        <JourneyTracker />
        <OfferCapture enabled={offers.adOffer} welcome={offers.welcome.enabled} event={offers.event} />
        <OfferSheet settings={offers.event} minOrder={offers.minOrder} />
      </div>
    </SeasonProvider>
  )
}
