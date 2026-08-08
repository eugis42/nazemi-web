import { PageBlocks } from '@/components/frontend/BlockRenderers'
import { NazemiRichText } from '@/components/frontend/NazemiRichText'
import { Tag } from '@/components/frontend/ui'
import { crossPostSiteName } from '@/lib/content'

type MediaValue = {
  alt?: null | string
  url?: null | string
}

const MediaFigure = ({ media }: { media?: MediaValue | null }) => {
  if (!media?.url) {
    return null
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={media.alt || ''} src={media.url} />
}

export const RenderBlocks = ({ blocks }: { blocks?: any[] | null }) => {
  return <PageBlocks blocks={blocks} />
}

export const RenderRichText = ({ data }: { data?: any }) => {
  if (!data) {
    return null
  }

  return (
    <div className="prose prose-nazemi max-w-none font-inter">
      <NazemiRichText data={data} />
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
