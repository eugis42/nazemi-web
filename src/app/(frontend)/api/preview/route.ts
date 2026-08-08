import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const secret = process.env.PREVIEW_SECRET
  const isDev = process.env.NODE_ENV === 'development'
  const provided = request.nextUrl.searchParams.get('secret')

  if (secret) {
    if (provided !== secret) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  } else if (!isDev) {
    return new NextResponse('Preview not configured', { status: 503 })
  }

  const path = request.nextUrl.searchParams.get('path')

  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return new NextResponse('Invalid path', { status: 400 })
  }

  const dm = await draftMode()
  dm.enable()
  redirect(path)
}
