import { PageBlocks } from '@/components/frontend/BlockRenderers'
import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { Tag } from '@/components/frontend/ui'
import {
  crossPostSiteName,
  mediaAlt,
  mediaAspectStyle,
  mediaFocalStyle,
  mediaSizeURL,
} from '@/lib/content'

type MediaValue = {
  alt?: null | string
  url?: null | string
  width?: number | null
  height?: number | null
  focalX?: number | null
  focalY?: number | null
  sizes?: Record<string, { url?: string | null } | null | undefined>
}

const MediaFigure = ({ media }: { media?: MediaValue | null }) => {
  if (!media) return null
  const src = mediaSizeURL(media as never, 'large')
  if (!src) return null
  const aspect = mediaAspectStyle(media as never, { size: 'large' })
  const focal = mediaFocalStyle(media as never)

  return (
    <span className="relative block w-full overflow-hidden" style={aspect}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={mediaAlt(media as never, '')}
        className="absolute inset-0 size-full object-cover"
        src={src}
        style={focal}
      />
    </span>
  )
}

export const RenderBlocks = ({ blocks }: { blocks?: any[] | null }) => {
  return <PageBlocks blocks={blocks} />
}

export const RenderRichText = ({ data, siteSlug = '' }: { data?: any; siteSlug?: string }) => {
  if (!data) {
    return null
  }

  return (
    <div className="prose-nazemi max-w-none">
      <NazemiRichText data={data} siteSlug={siteSlug} />
    </div>
  )
}

export const RenderMenu = ({
  items,
  title,
}: {
  items?: { href?: string; label?: string }[] | null
  title: string
}) => {
  if (!items?.length) {
    return null
  }

  return (
    <nav>
      <h2>{title}</h2>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.href}-${index}`}>
            <a href={item.href || '#'}>{item.label || item.href}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export const SiteBadge = ({
  currentSiteSlug,
  docSite,
}: {
  currentSiteSlug: string
  docSite?: unknown
}) => {
  const name = crossPostSiteName({
    currentSiteSlug,
    docSite,
  })

  if (!name) return null

  return <Tag>{name}</Tag>
}

export { MediaFigure }
