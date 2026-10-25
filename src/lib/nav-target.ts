import type { FormDoc } from '@/lib/form-types'
import {
  collectionHomePath,
  isCollectionHomeKey,
} from '@/lib/collection-homes'
import { isExternalHref } from '@/lib/links'

export type NavTargetInput = {
  href?: string | null
  label?: string | null
  linkType?: 'internal' | 'external' | null
  reference?: unknown
  /** Legacy doc CTA field — treated as external href when `href` empty. */
  title?: string | null
  url?: string | null
}

export type ResolvedNavTarget =
  | {
      kind: 'form'
      formId: number | string
      label: string
      formTitle: string
      form?: FormDoc | null
    }
  | {
      kind: 'link'
      href: string
      label: string
      external: boolean
    }

type RefDoc = {
  collectionKey?: string | null
  slug?: string | null
  title?: string | null
  name?: string | null
}

function collectionPath(relationTo: string, slug: string): string {
  switch (relationTo) {
    case 'stranky':
      return slug === 'home' || slug === 'homepage' ? '/' : `/${slug}`
    case 'aktuality':
      return `/aktuality/${slug}`
    case 'kalendar':
      return `/kalendar/${slug}`
    case 'workshopy':
      return `/workshopy/${slug}`
    case 'publikace':
      return `/publikace/${slug}`
    case 'projekty':
      return `/projekty/${slug}`
    default:
      return `/${slug}`
  }
}

export function resolveNavReferenceHref(
  reference: unknown,
): { href: string; title: string | null } | null {
  if (!reference || typeof reference !== 'object') return null
  const rel = reference as { relationTo?: unknown; value?: unknown }
  const relationTo = typeof rel.relationTo === 'string' ? rel.relationTo : null
  const value = rel.value
  if (!relationTo || value == null) return null
  if (relationTo === 'forms') return null

  if (typeof value === 'object') {
    const doc = value as RefDoc

    if (relationTo === 'prehledy') {
      if (!isCollectionHomeKey(doc.collectionKey)) return null
      const title = (typeof doc.title === 'string' && doc.title) || null
      return { href: collectionHomePath(doc.collectionKey), title }
    }

    const slug = typeof doc.slug === 'string' ? doc.slug : null
    if (!slug) return null
    const title =
      (typeof doc.title === 'string' && doc.title) ||
      (typeof doc.name === 'string' && doc.name) ||
      null
    return { href: collectionPath(relationTo, slug), title }
  }

  return null
}

function relationParts(reference: unknown): {
  relationTo: string | null
  value: unknown
} {
  if (!reference || typeof reference !== 'object') return { relationTo: null, value: null }
  const rel = reference as { relationTo?: unknown; value?: unknown }
  return {
    relationTo: typeof rel.relationTo === 'string' ? rel.relationTo : null,
    value: rel.value,
  }
}

function formIdFromValue(value: unknown): number | string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

function formTitleFromValue(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const title = (value as { title?: unknown }).title
  return typeof title === 'string' && title.trim() ? title.trim() : null
}

function asFormDoc(value: unknown): FormDoc | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null
  const id = (value as { id?: unknown }).id
  if (typeof id !== 'number' && typeof id !== 'string') return null
  return value as FormDoc
}

/** Resolve Interní/Zadat URL row (menus, block CTAs, doc ctas) — forms → modal. */
export function resolveNavTarget(input: NavTargetInput | null | undefined): ResolvedNavTarget | null {
  if (!input) return null

  const labelFrom =
    (typeof input.label === 'string' && input.label.trim()) ||
    (typeof input.title === 'string' && input.title.trim()) ||
    ''

  if (input.linkType === 'internal') {
    const { relationTo, value } = relationParts(input.reference)
    if (relationTo === 'forms') {
      const formId = formIdFromValue(value)
      if (formId == null) return null
      const formTitle = formTitleFromValue(value) || labelFrom || 'Formulář'
      const label = labelFrom || formTitle
      return {
        kind: 'form',
        formId,
        label,
        formTitle,
        form: asFormDoc(value),
      }
    }

    const resolved = resolveNavReferenceHref(input.reference)
    if (!resolved?.href) return null
    const label = labelFrom || resolved.title || resolved.href
    return { kind: 'link', href: resolved.href, label, external: false }
  }

  // external (default) + legacy rows with only `url`
  const href =
    (typeof input.href === 'string' && input.href.trim()) ||
    (typeof input.url === 'string' && input.url.trim()) ||
    ''
  if (!href) return null
  const label = labelFrom || href
  return { kind: 'link', href, label, external: isExternalHref(href) }
}
