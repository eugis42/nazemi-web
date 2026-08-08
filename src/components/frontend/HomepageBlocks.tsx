import type { Aktuality, Kalendar, Site } from '@/payload-types'
import {
  AboutBlock,
  EventsGrid,
  HeroBlock,
  NewsGrid,
  ProjectsBlock,
  type ContentBlock,
} from '@/components/frontend/BlockRenderers'
import { GalleryBlock } from '@/components/frontend/GalleryBlock'
import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { PillarsBlock } from '@/components/frontend/PillarsBlock'
import { resolveBlockActions } from '@/lib/block-actions'
import { getListingWhere, getPayloadClient } from '@/lib/frontend'
import { resolveGalleryImages } from '@/lib/gallery'

export { PageBlocks, WorkshopContentBlocks } from '@/components/frontend/BlockRenderers'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export async function HomepageBlocks({
  blocks,
  site,
}: {
  blocks?: ContentBlock[] | null
  site: Site
}) {
  if (!blocks?.length) return null

  const rendered = []

  for (const [index, block] of blocks.entries()) {
    const key = block.id || `${block.blockType}-${index}`
    switch (block.blockType) {
      case 'hero':
        rendered.push(<HeroBlock key={key} block={block} />)
        break
      case 'events':
        rendered.push(await renderEvents({ key, block, site }))
        break
      case 'pillars':
        rendered.push(<PillarsBlock key={key} block={block} siteSlug={site.slug} />)
        break
      case 'news':
        rendered.push(await renderNews({ key, block, site }))
        break
      case 'projects':
        rendered.push(<ProjectsBlock key={key} block={block} siteSlug={site.slug} />)
        break
      case 'about':
        rendered.push(<AboutBlock key={key} block={block} siteSlug={site.slug} />)
        break
      case 'richText':
        if (block.content) {
          rendered.push(
            <div className="prose-nazemi mx-auto w-full max-w-[874px]" key={key}>
              <NazemiRichText data={block.content as never} />
            </div>,
          )
        }
        break
      case 'gallery':
        rendered.push(
          <GalleryBlock
            caption={block.caption ? String(block.caption) : null}
            columns={(block.columns as '1' | '2' | '3' | null) || '2'}
            images={resolveGalleryImages(block.images)}
            key={key}
          />,
        )
        break
      default:
        break
    }
  }

  return <div className="container section-stack">{rendered}</div>
}

async function renderEvents({
  block,
  key,
  site,
}: {
  block: ContentBlock
  key: string
  site: Site
}) {
  const payload = await getPayloadClient()
  const selection = (block.selection as string) || 'auto'
  const limit = clamp(typeof block.limit === 'number' ? block.limit : 3, 3, 6)
  let items: Kalendar[] = []

  if (selection === 'manual' && Array.isArray(block.items)) {
    const ids = block.items
      .map((item) => (typeof item === 'object' && item !== null ? item.id : item))
      .filter((id): id is number | string => id !== null && id !== undefined && id !== '')
      .slice(0, 6)
    if (ids.length) {
      const result = await payload.find({
        collection: 'kalendar',
        depth: 2,
        limit: ids.length,
        pagination: false,
        where: {
          and: [
            { id: { in: ids } },
            await getListingWhere({
              collection: 'kalendar',
              includeCrossPosted: site.slug === 'nazemi',
              siteId: site.id,
            }),
          ],
        },
      })
      const byId = new Map(result.docs.map((doc) => [String(doc.id), doc]))
      items = ids
        .map((id) => byId.get(String(id)))
        .filter((doc): doc is Kalendar => Boolean(doc))
    }
  } else {
    const result = await payload.find({
      collection: 'kalendar',
      depth: 2,
      limit,
      sort: 'startDate',
      where: {
        and: [
          await getListingWhere({
            collection: 'kalendar',
            includeCrossPosted: site.slug === 'nazemi',
            siteId: site.id,
          }),
          {
            startDate: {
              greater_than_equal: new Date().toISOString(),
            },
          },
        ],
      },
    })
    items = result.docs
  }

  const actions = resolveBlockActions({
    actionHref: block.actionHref as string | undefined,
    actionLabel: block.actionLabel as string | undefined,
    actions: block.actions as never,
    defaultHref: '/kalendar',
    defaultLabel: 'Všechny události',
    siteSlug: site.slug,
  })

  return (
    <EventsGrid
      actions={actions}
      items={items}
      key={key}
      siteSlug={site.slug}
      title={(block.title as string) || 'Co se děje v NaZemi'}
    />
  )
}

async function renderNews({
  block,
  key,
  site,
}: {
  block: ContentBlock
  key: string
  site: Site
}) {
  const payload = await getPayloadClient()
  const selection = (block.selection as string) || 'auto'
  const limit = clamp(typeof block.limit === 'number' ? block.limit : 4, 4, 8)
  let items: Aktuality[] = []

  if (selection === 'manual' && Array.isArray(block.items)) {
    const ids = block.items
      .map((item) => (typeof item === 'object' && item !== null ? item.id : item))
      .filter((id): id is number | string => id !== null && id !== undefined && id !== '')
      .slice(0, 8)
    if (ids.length) {
      const result = await payload.find({
        collection: 'aktuality',
        depth: 2,
        limit: ids.length,
        pagination: false,
        where: {
          and: [
            { id: { in: ids } },
            await getListingWhere({
              collection: 'aktuality',
              includeCrossPosted: site.slug === 'nazemi',
              siteId: site.id,
            }),
          ],
        },
      })
      const byId = new Map(result.docs.map((doc) => [String(doc.id), doc]))
      items = ids
        .map((id) => byId.get(String(id)))
        .filter((doc): doc is Aktuality => Boolean(doc))
    }
  } else {
    const result = await payload.find({
      collection: 'aktuality',
      depth: 2,
      limit,
      sort: '-publishedAt',
      where: await getListingWhere({
        collection: 'aktuality',
        includeCrossPosted: site.slug === 'nazemi',
        siteId: site.id,
      }),
    })
    items = result.docs
  }

  const actions = resolveBlockActions({
    actionHref: block.actionHref as string | undefined,
    actionLabel: block.actionLabel as string | undefined,
    actions: block.actions as never,
    defaultHref: '/aktuality',
    defaultLabel: 'Všechny aktuality',
    siteSlug: site.slug,
  })

  return (
    <NewsGrid
      actions={actions}
      items={items}
      key={key}
      siteSlug={site.slug}
      title={(block.title as string) || 'Aktuality'}
    />
  )
}
