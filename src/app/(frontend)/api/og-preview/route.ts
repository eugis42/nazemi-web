import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { downloadPublicImage, fetchOpenGraph } from '@/lib/open-graph'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin-only: scrape OG once when editor asks. Public pages never call this —
 * card renders stored title/description/image.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const headerList = await getHeaders()
  const { user } = await payload.auth({ headers: headerList })
  if (!user) {
    return NextResponse.json({ error: 'Nejste přihlášeni.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'Chybí url.' }, { status: 400 })
  }

  try {
    const og = await fetchOpenGraph(url)
    let imageId: number | string | null = null

    if (og.imageUrl) {
      try {
        const file = await downloadPublicImage(og.imageUrl)
        const media = await payload.create({
          collection: 'media',
          data: {
            alt: og.title || 'Náhled externího webu',
          },
          file: {
            data: file.buffer,
            mimetype: file.mimeType,
            name: file.filename,
            size: file.buffer.length,
          },
          overrideAccess: false,
          user,
        })
        imageId = media.id
      } catch {
        // Image optional — title/desc still useful.
        imageId = null
      }
    }

    return NextResponse.json({
      description: og.description,
      image: imageId,
      title: og.title,
      url: og.url,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Načtení Open Graph selhalo.'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
