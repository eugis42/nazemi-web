import { NextResponse } from 'next/server'

import { ADMIN_SITE_COOKIE, MAIN_SITE_SLUG } from '@/lib/site-context'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { siteSlug?: string }
  const response = NextResponse.json({ ok: true })

  response.cookies.set(ADMIN_SITE_COOKIE, body.siteSlug || MAIN_SITE_SLUG, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
