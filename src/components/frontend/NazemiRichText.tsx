import {
  LinkJSXConverter,
  RichText as PayloadRichText,
} from '@payloadcms/richtext-lexical/react'
import type {
  SerializedBlockNode,
  SerializedLinkNode,
  SerializedRelationshipNode,
  SerializedUploadNode,
} from '@payloadcms/richtext-lexical'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'

import { ExpandingParagraph } from '@/components/frontend/ExpandingParagraph'
import { GalleryBlock } from '@/components/frontend/GalleryBlock'
import { LogoStrip, resolveLogoStripItems } from '@/components/frontend/LogoStrip'
import { RichTextRelation } from '@/components/frontend/RichTextRelation'
import { mediaAlt, mediaSizeURL, mediaURL } from '@/lib/content'
import { resolveGalleryImages } from '@/lib/gallery'
import { textColorCss } from '@/lib/lexical-text-color'
import { isExternalHref } from '@/lib/links'
import type { Media } from '@/payload-types'

/** Lexical serializes TextStateFeature attrs under `"$"`. */
const NODE_STATE_KEY = '$' as const

function applyTextColorState(
  node: { [NODE_STATE_KEY]?: Record<string, string> },
  children: ReactNode,
): ReactNode {
  const state = node[NODE_STATE_KEY]
  const token = state?.color
  if (!token) return children
  const color = textColorCss(token)
  if (!color) return children
  return (
    <span className="rt-text-color" data-color={token} style={{ color }}>
      {children}
    </span>
  )
}

type RichTextProps = {
  className?: string
  data?: ComponentProps<typeof PayloadRichText>['data'] | null
  siteSlug?: string
} & Omit<ComponentProps<typeof PayloadRichText>, 'data' | 'converters'>

type GalleryFields = {
  blockType: 'gallery'
  caption?: string | null
  columns?: '1' | '2' | '3' | null
  images?: unknown
}

type ExpandingParagraphFields = {
  blockType: 'expandingParagraph'
  body?: ComponentProps<typeof PayloadRichText>['data'] | null
  summary?: string | null
}

type LogoStripFields = {
  blockType: 'logoStrip'
  images?: unknown
  links?: unknown
  logos?: unknown
  title?: string | null
}

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
      <a className="rt-link rt-link--file" href={url} rel="noopener noreferrer">
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

function RichTextLink({
  children,
  href,
  newTab,
}: {
  children: ReactNode
  href: string
  newTab?: boolean | null
}) {
  const external = isExternalHref(href) || Boolean(newTab)
  return (
    <a
      className={external ? 'rt-link rt-link--external' : 'rt-link rt-link--internal'}
      href={href || '#'}
      rel={external ? 'noopener noreferrer' : undefined}
      target={external ? '_blank' : undefined}
    >
      {children}
    </a>
  )
}

/**
 * Lexical rich text with auto external links (new tab) + relationship embeds + block embeds.
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
        text: (args) => {
          const base =
            typeof defaultConverters.text === 'function'
              ? defaultConverters.text(args)
              : args.node.text
          return applyTextColorState(
            args.node as { [NODE_STATE_KEY]?: Record<string, string> },
            base,
          )
        },
        relationship: ({ node }: { node: SerializedRelationshipNode }) => (
          <RichTextRelation
            relationTo={node.relationTo}
            siteSlug={siteSlug}
            value={node.value}
          />
        ),
        upload: ({ node }: { node: SerializedUploadNode }) => <UploadImage node={node} />,
        blocks: {
          gallery: ({ node }: { node: SerializedBlockNode<GalleryFields> }) => (
            <div className="not-prose my-10 w-full" data-rt-block="gallery">
              <GalleryBlock
                caption={node.fields.caption}
                columns={node.fields.columns}
                images={resolveGalleryImages(node.fields.images)}
              />
            </div>
          ),
          logoStrip: ({ node }: { node: SerializedBlockNode<LogoStripFields> }) => {
            const logos = resolveLogoStripItems(node.fields)
            if (!logos.length) return null
            return (
              <div className="not-prose my-10 w-full" data-rt-block="logoStrip">
                <LogoStrip logos={logos} title={node.fields.title} />
              </div>
            )
          },
          expandingParagraph: ({
            node,
          }: {
            node: SerializedBlockNode<ExpandingParagraphFields>
          }) => {
            const summary = node.fields.summary?.trim()
            if (!summary || !node.fields.body) return null
            return (
              <ExpandingParagraph
                body={<NazemiRichText data={node.fields.body} siteSlug={siteSlug} />}
                summary={summary}
              />
            )
          },
        },
        link: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          let href = node.fields.url ?? ''
          if (node.fields.linkType === 'internal') {
            href = internalDocToHref({ linkNode: node })
          }
          return (
            <RichTextLink href={href} newTab={node.fields.newTab}>
              {children}
            </RichTextLink>
          )
        },
        autolink: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          const href = node.fields.url ?? ''
          return (
            <RichTextLink href={href} newTab={node.fields.newTab}>
              {children}
            </RichTextLink>
          )
        },
      })}
      data={data}
    />
  )
}
