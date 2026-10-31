// Runs before every page request:
// - www. of the site's domain moves permanently to the same page without www;
// - a product with a colourway or fabric in its address (?variant=, ?fabric=)
//   is served from its cached colourway route, /products/<slug>/<sku>[/<fabric>]
//   (audit A4), and that inner address, opened directly, goes back to the real one;
// - /admin refreshes the session and sends anyone not signed in to the
//   ordinary /login page, remembering where they were going.
// It protects pages only. Server Actions are public POST endpoints, so every
// admin action checks requireAdmin() itself, and the database checks
// is_admin() again.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { canonicalHostRedirect, externalOrigin } from '@/lib/http/origin'
import { productRoute } from '@/lib/http/product-route'

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const canonical = canonicalHostRedirect(request.headers, `${pathname}${search}`)
  if (canonical) return NextResponse.redirect(canonical, 308)

  const product = productRoute(pathname, request.nextUrl.searchParams)
  if (product?.rewrite) {
    const url = request.nextUrl.clone()
    url.pathname = product.rewrite
    return NextResponse.rewrite(url)
  }
  if (product?.redirect) return NextResponse.redirect(new URL(product.redirect, externalOrigin(request.headers, request.nextUrl.origin)), 308)

  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return NextResponse.next()

  const { response, userId } = await updateSession(request)
  if (!userId) {
    const login = new URL('/login', externalOrigin(request.headers, request.nextUrl.origin))
    if (pathname !== '/admin') login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  // Pages and API routes; not the build's own files or the static brand assets.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|brand/|icons/).*)'],
}
