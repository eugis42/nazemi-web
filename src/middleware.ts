import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { FRONTEND_SITE_HEADER, MAIN_SITE_SLUG, PATHNAME_HEADER, siteSlugFromHost } from '@/lib/site-context'

/**
 * Propagate site slug + pathname into request headers so layouts / not-found
 * can resolve `?site=` and guess search keywords from the failed URL.
 */
export function middleware(request: NextRequest) {
  const fromQuery = request.nextUrl.searchParams.get('site')
  const fromHost = siteSlugFromHost(request.headers.get('host'))
  const siteSlug = fromQuery || fromHost

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname)

  if (siteSlug && siteSlug !== MAIN_SITE_SLUG) {
    requestHeaders.set(FRONTEND_SITE_HEADER, siteSlug)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, Payload API/admin, and static assets.
     */
    '/((?!_next/static|_next/image|api/|admin/|favicon.ico|.*\\..*).*)',
  ],
}
