import type { Metadata, Viewport } from 'next'
import { Gloock, Figtree } from 'next/font/google'
import './globals.css'
import { BRAND, BRAND_COLOURS, OPEN_GRAPH_BASE } from '@/config/brand'
import { META_DESCRIPTION } from '@/config/promises'
import { METADATA_BASE } from '@/config/site'
import { SITE_INDEXABLE } from '@/config/env'
import { preconnect } from 'react-dom'
import { CONSENT_COOKIE } from '@/config/tracking'
import { consentFlagScript } from '@/lib/tracking/consent'

// Headings and prices use Gloock (docs/DESIGN.md): a high-contrast serif close to the logo's
// wordmark. It has one weight, so one small file is downloaded.
const gloock = Gloock({ subsets: ['latin'], weight: '400', variable: '--font-gloock', display: 'swap' })
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(METADATA_BASE),
  title: {
    template: `%s | ${BRAND.name}`,
    // Written for "cash on delivery sofas" and "sofa fast delivery uk" (docs/KEYWORDS.md).
    default: `${BRAND.name}: sofas delivered in days, pay cash on delivery`,
  },
  description: META_DESCRIPTION,
  applicationName: BRAND.name,
  openGraph: OPEN_GRAPH_BASE,
  robots: SITE_INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: BRAND_COLOURS.wine,
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Photos come from Cloudinary: open that connection while the page is still arriving.
  preconnect('https://res.cloudinary.com')
  return (
    // suppressHydrationWarning: the head script below may add data-consent to <html> before React starts.
    <html lang="en-GB" className={`${gloock.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: consentFlagScript(CONSENT_COOKIE) }} />
      </head>
      <body className="flex min-h-svh flex-col bg-white">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
