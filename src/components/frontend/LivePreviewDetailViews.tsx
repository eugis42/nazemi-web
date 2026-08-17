'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'

import type { Aktuality, Kalendar, Projekty, Publikace, Stranky, Workshopy } from '@/payload-types'

import { PageBlocks, WorkshopContentBlocks } from '@/components/frontend/BlockRenderers'
import { PageIntro } from '@/components/frontend/cards'
import { mediaFocalStyle, mediaSizeURL } from '@/lib/content'
import {
  EventBody,
  NewsArticle,
  ProjectDetail,
  PublicationDetail,
} from '@/components/frontend/details'

function useDocLivePreview<T extends Record<string, any>>(initialData: T) {
  return useLivePreview({
    depth: 2,
    initialData,
    serverURL: typeof window !== 'undefined' ? window.location.origin : '',
  })
}

export function StrankaLivePreview({
  initialData,
  siteSlug,
}: {
  initialData: Stranky
  siteName: string
  siteSlug: string
}) {
  const { data: page } = useDocLivePreview(initialData)
  const cover = page.coverImage && typeof page.coverImage === 'object' ? page.coverImage : null

  return (
    <article data-site={siteSlug}>
      <PageIntro
        color={page.headerColor}
        coverAlt={cover?.alt || page.title}
        coverStyle={mediaFocalStyle(cover)}
        coverUrl={cover ? mediaSizeURL(cover, 'hero') : null}
        description={page.excerpt}
        title={page.title}
      />
      {page.isHomepage ? null : (
        <div className="pt-content-top">
          <PageBlocks blocks={page.content as never} skipPageIntro />
        </div>
      )}
    </article>
  )
}

export function AktualityLivePreview({
  currentSiteSlug,
  initialData,
  skipBigHero = false,
  skipTopPad = false,
}: {
  currentSiteSlug: string
  initialData: Aktuality
  skipBigHero?: boolean
  skipTopPad?: boolean
}) {
  const { data: item } = useDocLivePreview(initialData)

  return (
    <NewsArticle
      item={item}
      siteSlug={currentSiteSlug}
      skipBigHero={skipBigHero}
      skipTopPad={skipTopPad}
    />
  )
}

export function KalendarLivePreview({
  currentSiteSlug,
  initialData,
}: {
  currentSiteSlug: string
  initialData: Kalendar
}) {
  const { data: item } = useDocLivePreview(initialData)

  // Overview lives in SiteShell `beforeMain` on the public page.
  return <EventBody item={item} />
}

export function ProjektLivePreview({ initialData }: { initialData: Projekty }) {
  const { data: item } = useDocLivePreview(initialData)

  // Header lives in SiteShell `beforeMain` on the public page.
  return <ProjectDetail item={item} />
}

export function WorkshopLivePreview({
  initialData,
}: {
  currentSiteSlug: string
  initialData: Workshopy
}) {
  const { data: item } = useDocLivePreview(initialData)

  // Header lives in SiteShell `beforeMain` on the public page.
  return (
    <WorkshopContentBlocks blocks={item.blocks as never} />
  )
}

export function PublikaceLivePreview({ initialData }: { initialData: Publikace }) {
  const { data: item } = useDocLivePreview(initialData)

  return <PublicationDetail item={item} />
}
