import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { FRONTEND_SITE_HEADER, MAIN_SITE_SLUG, siteSlugFromHost } from '@/lib/site-context'

/**
 * Propagate site slug into a request header so root layout metadata
 * can resolve `?site=` (layout generateMetadata has no searchParams).
 */
export function middleware(request: NextRequest) {
  const fromQuery = request.nextUrl.searchParams.get('site')
  const fromHost = siteSlugFromHost(request.headers.get('host'))
  const siteSlug = fromQuery || fromHost

  if (!siteSlug || siteSlug === MAIN_SITE_SLUG) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(FRONTEND_SITE_HEADER, siteSlug)

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
