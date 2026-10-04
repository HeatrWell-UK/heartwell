// Runs before /admin requests: refreshes the session and sends anyone not
// signed in to the ordinary /login page, remembering where they were going.
// It protects pages only. Server Actions are public POST endpoints, so every
// admin action checks requireAdmin() itself, and the database checks
// is_admin() again.

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { externalOrigin } from '@/lib/http/origin'

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request)

  if (!userId) {
    const { pathname } = request.nextUrl
    const login = new URL('/login', externalOrigin(request.headers, request.nextUrl.origin))
    if (pathname !== '/admin') login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
