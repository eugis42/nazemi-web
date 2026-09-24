import {
  LinkJSXConverter,
  RichText as PayloadRichText,
} from '@payloadcms/richtext-lexical/react'
import type {
  SerializedHeadingNode,
  SerializedLinkNode,
  SerializedRelationshipNode,
  SerializedUploadNode,
} from '@payloadcms/richtext-lexical'
import type { ComponentProps, CSSProperties, ElementType, ReactNode } from 'react'

import { RichTextRelation } from '@/components/frontend/RichTextRelation'
import { mediaAlt, mediaSizeURL, mediaURL } from '@/lib/content'
import { isExternalHref } from '@/lib/links'
import type { Media } from '@/payload-types'

type RichTextProps = {
  className?: string
  data?: ComponentProps<typeof PayloadRichText>['data'] | null
  siteSlug?: string
} & Omit<ComponentProps<typeof PayloadRichText>, 'data' | 'converters'>

function internalDocToHref({ linkNode }: { linkNode: SerializedLinkNode }) {
  const doc = linkNode.fields?.doc
  const value = doc?.value
  const slug =
    value && typeof value === 'object' && 'slug' in value
      ? String((value as { slug?: string }).slug || '')
      : ''
  if (!slug) return '#'
  switch (doc?.relationTo) {
    case 'aktuality':
      return `/aktuality/${slug}`
    case 'kalendar':
      return `/kalendar/${slug}`
    case 'projekty':
      return `/projekty/${slug}`
    case 'workshopy':
      return `/workshopy/${slug}`
    case 'publikace':
      return `/publikace/${slug}`
    case 'stranky':
      return slug === 'home' ? '/' : `/${slug}`
    default:
      return `/${slug}`
  }
}

function uploadWidth(node: SerializedUploadNode): {
  mode: 'auto' | 'px' | 'percent'
  percent: number | null
  px: number | null
} {
  const fields = node.fields as
    | {
        maxWidth?: number | null
        widthMode?: 'auto' | 'px' | 'percent' | null
        widthPercent?: number | null
      }
    | null
    | undefined
  const px =
    typeof fields?.maxWidth === 'number' && fields.maxWidth > 0 ? fields.maxWidth : null
  const percent =
    typeof fields?.widthPercent === 'number' && fields.widthPercent > 0
      ? Math.min(100, fields.widthPercent)
      : null
  // Legacy uploads only stored maxWidth → treat as px.
  const mode =
    fields?.widthMode === 'px' || fields?.widthMode === 'percent' || fields?.widthMode === 'auto'
      ? fields.widthMode
      : px
        ? 'px'
        : 'auto'
  return { mode, percent, px }
}

function UploadImage({ node }: { node: SerializedUploadNode }) {
  if (typeof node.value !== 'object' || !node.value) return null
  const uploadDoc = node.value as Media
  const alt =
    (typeof node.fields?.alt === 'string' && node.fields.alt) ||
    mediaAlt(uploadDoc) ||
    ''
  const url = mediaSizeURL(uploadDoc, 'large') || mediaURL(uploadDoc)
  if (!url) return null

  if (!uploadDoc.mimeType?.startsWith('image')) {
    return (
      <a href={url} rel="noopener noreferrer">
        {uploadDoc.filename || url}
      </a>
    )
  }

  const { mode, percent, px } = uploadWidth(node)
  const effective =
    mode === 'px' && px ? 'px' : mode === 'percent' && percent ? 'percent' : 'auto'
  const naturalWidth =
    typeof uploadDoc.width === 'number' && uploadDoc.width > 0 ? uploadDoc.width : null
  // Full-width mode: fill column but never upscale past original pixels.
  const capPx = effective === 'px' ? px : effective === 'auto' ? naturalWidth : null

  const style: CSSProperties | undefined =
    capPx != null
      ? { height: 'auto', maxWidth: `min(100%, ${capPx}px)`, width: 'auto' }
      : effective === 'percent'
        ? { height: 'auto', ['--upload-w' as string]: `${percent}%` }
        : undefined

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      data-max-width={capPx ?? undefined}
      data-upload-w={effective === 'auto' ? undefined : effective}
      height={uploadDoc.height ?? undefined}
      src={url}
      style={style}
      width={capPx ?? naturalWidth ?? undefined}
    />
  )
}

/**
 * Lexical rich text with auto external links (new tab) + relationship embeds.
 * ↗ prefix via `.prose-nazemi` CSS for http(s)/mailto/tel.
 */
export function NazemiRichText({ className, data, siteSlug = '', ...rest }: RichTextProps) {
  if (!data) return null

  return (
    <PayloadRichText
      {...rest}
      className={className}
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        ...LinkJSXConverter({ internalDocToHref }),
        // Live + imported content may still store h1; page chrome already owns <h1>.
        heading: ({ node, nodesToJSX }: {
          node: SerializedHeadingNode
          nodesToJSX: (args: { nodes: SerializedHeadingNode['children'] }) => ReactNode
        }) => {
          const children = nodesToJSX({ nodes: node.children })
          const Tag = (node.tag === 'h1' ? 'h2' : node.tag) as ElementType
          return <Tag>{children}</Tag>
        },
        relationship: ({ node }: { node: SerializedRelationshipNode }) => (
          <RichTextRelation
            relationTo={node.relationTo}
            siteSlug={siteSlug}
            value={node.value}
          />
        ),
        upload: ({ node }: { node: SerializedUploadNode }) => <UploadImage node={node} />,
        link: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          let href = node.fields.url ?? ''
          if (node.fields.linkType === 'internal') {
            href = internalDocToHref({ linkNode: node })
          }
          const external = isExternalHref(href) || Boolean(node.fields.newTab)
          return (
            <a
              href={href || '#'}
              rel={external ? 'noopener noreferrer' : undefined}
              target={external ? '_blank' : undefined}
            >
              {children}
            </a>
          )
        },
        autolink: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          const href = node.fields.url ?? ''
          const external = isExternalHref(href) || Boolean(node.fields.newTab)
          return (
            <a
              href={href || '#'}
              rel={external ? 'noopener noreferrer' : undefined}
              target={external ? '_blank' : undefined}
            >
              {children}
            </a>
          )
        },
      })}
      data={data}
    />
  )
}
