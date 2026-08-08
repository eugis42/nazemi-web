import {
  LinkJSXConverter,
  RichText as PayloadRichText,
} from '@payloadcms/richtext-lexical/react'
import type { SerializedLinkNode } from '@payloadcms/richtext-lexical'
import type { ComponentProps } from 'react'

import { isExternalHref } from '@/lib/links'

type RichTextProps = {
  className?: string
  data?: ComponentProps<typeof PayloadRichText>['data'] | null
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

/**
 * Lexical rich text with auto external links (new tab).
 * ↗ prefix via `.prose-nazemi` CSS for http(s)/mailto/tel.
 */
export function NazemiRichText({ className, data, ...rest }: RichTextProps) {
  if (!data) return null

  return (
    <PayloadRichText
      {...rest}
      className={className}
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        ...LinkJSXConverter({ internalDocToHref }),
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
