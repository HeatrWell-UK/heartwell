import type { Metadata, Viewport } from 'next'
import { Besley, Figtree } from 'next/font/google'
import './globals.css'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { BRAND, BRAND_COLOURS } from '@/config/brand'
import { META_DESCRIPTION } from '@/config/promises'
import { METADATA_BASE } from '@/config/site'
import { SITE_INDEXABLE } from '@/config/env'

const besley = Besley({ subsets: ['latin'], variable: '--font-besley', display: 'swap' })
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE),
  title: {
    template: `%s | ${BRAND.name}`,
    default: `${BRAND.name} | Sofas made to order, pay on delivery`,
  },
  description: META_DESCRIPTION,
  applicationName: BRAND.name,
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: BRAND.name,
    url: '/',
  },
  robots: SITE_INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: BRAND_COLOURS.wine,
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${besley.variable} ${figtree.variable}`}>
      <body className="flex min-h-svh flex-col bg-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
        >
          Skip to content
        </a>
        <div id="page" className="flex flex-1 flex-col">
          <AnnouncementBar />
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
