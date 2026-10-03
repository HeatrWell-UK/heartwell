// Runs before /admin requests: refreshes the admin session and sends anyone
// not signed in to the sign-in page. It protects pages only. Server Actions
// are public POST endpoints, so every admin action checks requireAdmin()
// itself, and the database checks is_admin() again.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { externalOrigin } from '@/lib/http/origin'

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (pathname !== '/admin/login' && !userId) {
    const login = new URL('/admin/login', externalOrigin(request.headers, request.nextUrl.origin))
    if (pathname !== '/admin') login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
