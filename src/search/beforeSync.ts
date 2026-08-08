import type { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types'

import { buildSearchText } from '@/lib/czech-stem'
import { flattenLexical, joinSearchText, relationId, relationTitles } from '@/search/flatten'

function siteIdFromDoc(doc: Record<string, unknown>) {
  return relationId(doc.site)
}

function isPastEvent(startDate?: string | null, endDate?: string | null) {
  const end = endDate || startDate
  if (!end) return false
  const date = new Date(end)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}

function excerptForCollection(collectionSlug: string, doc: Record<string, unknown>): string {
  const title = typeof doc.title === 'string' ? doc.title : ''
  const excerpt = typeof doc.excerpt === 'string' ? doc.excerpt : ''
  const authorName = typeof doc.authorName === 'string' ? doc.authorName : ''

  switch (collectionSlug) {
    case 'stranky': {
      const blocks = Array.isArray(doc.content) ? doc.content : []
      const blockText = blocks
        .map((block) => {
          if (!block || typeof block !== 'object') return ''
          const b = block as Record<string, unknown>
          if (b.blockType === 'pageIntro' && typeof b.lead === 'string') return b.lead
          if (b.blockType === 'richText') return flattenLexical(b.content)
          return ''
        })
        .filter(Boolean)
      const homepage = Array.isArray(doc.homepageContent) ? doc.homepageContent : []
      const homeText = homepage
        .map((block) => {
          if (!block || typeof block !== 'object') return ''
          const b = block as Record<string, unknown>
          if (typeof b.title === 'string') return b.title
          if (typeof b.subheadline === 'string') return b.subheadline
          return flattenLexical(b)
        })
        .filter(Boolean)
      return joinSearchText([title, excerpt, ...blockText, ...homeText])
    }
    case 'aktuality':
      return joinSearchText([
        title,
        excerpt,
        typeof doc.description === 'string' ? doc.description : '',
        authorName,
        ...relationTitles(doc.tags),
        flattenLexical(doc.content),
      ])
    case 'kalendar': {
      const location =
        doc.location && typeof doc.location === 'object'
          ? (doc.location as Record<string, unknown>)
          : {}
      return joinSearchText([
        title,
        excerpt,
        typeof doc.description === 'string' ? doc.description : '',
        typeof location.name === 'string' ? location.name : '',
        typeof location.city === 'string' ? location.city : '',
        typeof location.venue === 'string' ? location.venue : '',
        typeof location.address === 'string' ? location.address : '',
        ...relationTitles(doc.tags),
        flattenLexical(doc.content),
      ])
    }
    case 'projekty': {
      const ctas = Array.isArray(doc.ctas) ? doc.ctas : []
      const linkLabels = ctas
        .map((link) =>
          link && typeof link === 'object' && typeof (link as { title?: string }).title === 'string'
            ? (link as { title: string }).title
            : '',
        )
        .filter(Boolean)
      return joinSearchText([title, excerpt, ...linkLabels, flattenLexical(doc.content)])
    }
    case 'workshopy': {
      const takeaways = Array.isArray(doc.takeaways) ? doc.takeaways : []
      const takeawayText = takeaways
        .map((row) =>
          row && typeof row === 'object' && typeof (row as { item?: string }).item === 'string'
            ? (row as { item: string }).item
            : '',
        )
        .filter(Boolean)
      const blocks = Array.isArray(doc.blocks) ? doc.blocks : []
      const blockText = blocks
        .map((block) => {
          if (!block || typeof block !== 'object') return ''
          const b = block as Record<string, unknown>
          if (b.blockType === 'richText') return flattenLexical(b.content)
          if (b.blockType === 'speakers' && Array.isArray(b.people)) {
            return b.people
              .map((person) =>
                person && typeof person === 'object'
                  ? [(person as { name?: string }).name, (person as { role?: string }).role]
                      .filter(Boolean)
                      .join(' ')
                  : '',
              )
              .filter(Boolean)
              .join(' ')
          }
          if (b.blockType === 'testimonials' && Array.isArray(b.items)) {
            return b.items
              .map((item) =>
                item && typeof item === 'object'
                  ? [
                      (item as { quote?: string }).quote,
                      (item as { author?: string }).author,
                      (item as { role?: string }).role,
                    ]
                      .filter(Boolean)
                      .join(' ')
                  : '',
              )
              .filter(Boolean)
              .join(' ')
          }
          return ''
        })
        .filter(Boolean)
      return joinSearchText([
        title,
        excerpt,
        typeof doc.duration === 'string' ? doc.duration : '',
        typeof doc.groupSize === 'string' ? doc.groupSize : '',
        typeof doc.price === 'string' ? doc.price : '',
        ...takeawayText,
        ...relationTitles(doc.audiences),
        ...relationTitles(doc.topics),
        ...blockText,
      ])
    }
    case 'publikace':
      return joinSearchText([
        title,
        authorName,
        excerpt,
        ...relationTitles(doc.types),
        ...relationTitles(doc.topics),
        flattenLexical(doc.content),
      ])
    default:
      return joinSearchText([title, excerpt, flattenLexical(doc.content)])
  }
}

export const searchBeforeSync: BeforeSync = ({ collectionSlug, originalDoc, searchDoc }) => {
  const doc = (originalDoc || {}) as Record<string, unknown>
  const title = typeof doc.title === 'string' ? doc.title : searchDoc.title
  const slug = typeof doc.slug === 'string' ? doc.slug : ''
  const isHomepage = Boolean(doc.isHomepage)
  const site = siteIdFromDoc(doc)
  const startDate = typeof doc.startDate === 'string' ? doc.startDate : null
  const endDate = typeof doc.endDate === 'string' ? doc.endDate : null
  const publishedAt = typeof doc.publishedAt === 'string' ? doc.publishedAt : null
  const authorName = typeof doc.authorName === 'string' ? doc.authorName : null
  const excerpt = excerptForCollection(collectionSlug, doc)
  const resolvedTitle = title || searchDoc.title || ''

  const next: DocToSync = {
    ...searchDoc,
    title: resolvedTitle,
    collectionSlug,
    // Homepage lives at `/` — empty slug keeps siteContentPath correct.
    docSlug: collectionSlug === 'stranky' && isHomepage ? '' : slug,
    excerpt,
    searchText: buildSearchText(`${resolvedTitle} ${excerpt}`),
    site: site ?? undefined,
    publishedAt: publishedAt ?? undefined,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    authorName: authorName ?? undefined,
    eventIsPast: collectionSlug === 'kalendar' ? isPastEvent(startDate, endDate) : false,
  }

  return next
}
