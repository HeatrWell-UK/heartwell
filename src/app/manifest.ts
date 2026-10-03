import type { MetadataRoute } from 'next'
import { BRAND, BRAND_COLOURS } from '@/config/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    start_url: '/',
    display: 'browser',
    background_color: BRAND_COLOURS.white,
    theme_color: BRAND_COLOURS.wine,
    lang: 'en-GB',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
