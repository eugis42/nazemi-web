'use client'

import { useRowLabel } from '@payloadcms/ui'

type RefDoc = { title?: string | null; name?: string | null }

type MenuRowData = {
  label?: string | null
  linkType?: 'internal' | 'external' | null
  href?: string | null
  reference?:
    | number
    | string
    | RefDoc
    | {
        relationTo?: string
        value?: number | string | RefDoc | null
      }
    | null
}

function referenceTitle(reference: MenuRowData['reference']): string | null {
  if (!reference || typeof reference !== 'object') return null
  const value =
    'value' in reference ? reference.value : ('title' in reference || 'name' in reference ? reference : null)
  if (!value || typeof value !== 'object') return null
  const doc = value as RefDoc
  if (typeof doc.title === 'string' && doc.title.trim()) return doc.title
  if (typeof doc.name === 'string' && doc.name.trim()) return doc.name
  return null
}

export function MenuItemRowLabel() {
  const { data, rowNumber } = useRowLabel<MenuRowData>()
  const fromLabel = typeof data?.label === 'string' ? data.label.trim() : ''
  const fromRef = referenceTitle(data?.reference)
  const fromHref = typeof data?.href === 'string' ? data.href.trim() : ''
  const text = fromLabel || fromRef || fromHref || `Položka ${String(rowNumber).padStart(2, '0')}`

  return <span>{text}</span>
}
