import { BRAND_COLOURS } from '@/config/brand'

// The admin's own web app manifest, so "Add to Home Screen" opens the
// dashboard full screen as "Heartwell Admin". It sits outside /admin because
// browsers fetch manifests without the sign-in cookie, and /admin sends
// anyone without it to /login.
export const dynamic = 'force-static'

export function GET() {
  return Response.json(
    {
      name: 'Heartwell Admin',
      short_name: 'HW Admin',
      description: 'Orders and the shop, from your phone.',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      background_color: '#140b0e',
      theme_color: BRAND_COLOURS.wine,
      lang: 'en-GB',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
}
