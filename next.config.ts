import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'
const indexable = process.env.SITE_INDEXABLE === 'true' && process.env.NEXT_PUBLIC_APP_ENV === 'production'

/**
 * Content Security Policy. Starts strict and widens only when a phase adds a
 * real need (Supabase in Phase 4, Meta and GA4 in Phase 14), each with a note.
 * 'unsafe-inline' for scripts is required by Next.js' inline bootstrap without
 * nonces; 'unsafe-eval' only in development (React Refresh).
 */
// Meta Pixel and GA4 (Phase 14). They load only on the live domain, after
// consent where it's needed (src/components/tracking/Tracking.tsx); these lines
// just let them work when they do.
const META = 'https://connect.facebook.net https://www.facebook.com'
const GOOGLE = 'https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://connect.facebook.net https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com ${META} ${GOOGLE}`,
  "font-src 'self' data:",
  `connect-src 'self' ${META} ${GOOGLE}`,
  "media-src 'self' https://res.cloudinary.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

// The admin also uploads photos straight to Cloudinary (signed by the server).
const adminCsp = csp.replace("connect-src 'self'", "connect-src 'self' https://api.cloudinary.com")

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          // Previews and the pre-launch site stay out of search results.
          ...(indexable ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
        ],
      },
      // Later entries win for the same header, so this replaces the policy on admin pages only.
      { source: '/admin/:path*', headers: [{ key: 'Content-Security-Policy', value: adminCsp }] },
    ]
  },
}

export default nextConfig
