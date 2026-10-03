import type { ReactNode } from 'react'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

/**
 * The storefront's frame: announcement bar, header, footer. #page is what the
 * menu drawer marks inert while it's open.
 */
export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div id="page" className="flex flex-1 flex-col">
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
