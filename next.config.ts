import { execFileSync } from 'node:child_process'
import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

/**
 * The commit being built, shown on the Status page and /api/health. A host's
 * own variable when it sets one (Vercel's build has no .git folder), else
 * git itself (Hostinger), else "local". Display only: nothing depends on it.
 */
function buildCommit(): string {
  const fromHost = process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA
  if (fromHost) return fromHost.slice(0, 7)
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'local'
  } catch {
    return 'local'
  }
}
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
  env: { HW_BUILD_COMMIT: buildCommit() },
  // Hostinger adds `output: 'standalone'` itself before building, so it isn't
  // set here (Vercel doesn't need it). Keep this file exporting a plain object:
  // Hostinger can't add it to a config that is a function.
  // Not experimental.inlineCss: tried in Phase 18, but Next 16.3 also copies the
  // stylesheet twice into each page's React payload: the home page went from
  // 18 KB to 57 KB gzipped to save one 13 KB request (docs/QA-REPORT.md).
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
