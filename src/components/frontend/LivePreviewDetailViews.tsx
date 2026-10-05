'use client'

import type { Aktuality, Kalendar, Projekty, Publikace, Stranky, Workshopy } from '@/payload-types'

import { PageBlocks, WorkshopContentBlocks } from '@/components/frontend/BlockRenderers'
import { PageIntro, ProjectHeader } from '@/components/frontend/cards'
import {
  DocLivePreviewProvider,
  useLivePreviewData,
} from '@/components/frontend/LivePreviewProvider'
import {
  EventBody,
  EventOverview,
  NewsArticle,
  NewsArticleHero,
  ProjectDetail,
  PublicationBody,
  PublicationHeader,
  WorkshopHeader,
} from '@/components/frontend/details'
import { mediaFocalStyle, mediaSizeURL } from '@/lib/content'

export { DocLivePreviewProvider }

export function StrankaIntroLivePreview() {
  const page = useLivePreviewData<Stranky>()
  const cover = page.coverImage && typeof page.coverImage === 'object' ? page.coverImage : null

  return (
    <PageIntro
      color={page.headerColor}
      coverAlt={cover?.alt || page.title}
      coverStyle={mediaFocalStyle(cover)}
      coverUrl={cover ? mediaSizeURL(cover, 'hero') : null}
      description={page.excerpt}
      title={page.title}
    />
  )
}

export function StrankaBlocksLivePreview({ siteSlug }: { siteSlug: string }) {
  const page = useLivePreviewData<Stranky>()
  if (page.isHomepage) return null

  return <PageBlocks blocks={page.content as never} siteSlug={siteSlug} skipPageIntro />
}

export function AktualityHeroLivePreview() {
  const item = useLivePreviewData<Aktuality>()
  return <NewsArticleHero item={item} />
}

export function AktualityLivePreview({
  currentSiteSlug,
  skipBigHero = false,
  skipTopPad = false,
}: {
  currentSiteSlug: string
  skipBigHero?: boolean
  skipTopPad?: boolean
}) {
  const item = useLivePreviewData<Aktuality>()

  return (
    <NewsArticle
      item={item}
      siteSlug={currentSiteSlug}
      skipBigHero={skipBigHero}
      skipTopPad={skipTopPad}
    />
  )
}

export function KalendarOverviewLivePreview({ siteSlug }: { siteSlug: string }) {
  const item = useLivePreviewData<Kalendar>()
  return <EventOverview item={item} siteSlug={siteSlug} />
}

export function KalendarLivePreview({ currentSiteSlug }: { currentSiteSlug: string }) {
  const item = useLivePreviewData<Kalendar>()
  return <EventBody item={item} siteSlug={currentSiteSlug} />
}

export function ProjektHeaderLivePreview() {
  const item = useLivePreviewData<Projekty>()
  return <ProjectHeader item={item} />
}

export function ProjektLivePreview({ siteSlug }: { siteSlug?: string }) {
  const item = useLivePreviewData<Projekty>()
  return <ProjectDetail item={item} siteSlug={siteSlug} />
}

export function WorkshopHeaderLivePreview({ siteSlug }: { siteSlug: string }) {
  const item = useLivePreviewData<Workshopy>()
  return <WorkshopHeader item={item} siteSlug={siteSlug} />
}

export function WorkshopLivePreview({ currentSiteSlug }: { currentSiteSlug: string }) {
  const item = useLivePreviewData<Workshopy>()
  return <WorkshopContentBlocks blocks={item.blocks as never} siteSlug={currentSiteSlug} />
}

export function PublikaceHeaderLivePreview({ siteSlug }: { siteSlug: string }) {
  const item = useLivePreviewData<Publikace>()
  return <PublicationHeader item={item} siteSlug={siteSlug} />
}

export function PublikaceBodyLivePreview() {
  const item = useLivePreviewData<Publikace>()
  return <PublicationBody item={item} />
}
