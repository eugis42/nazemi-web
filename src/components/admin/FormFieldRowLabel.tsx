'use client'

import { useRowLabel } from '@payloadcms/ui'
import { useCallback, type MouseEvent } from 'react'

import { formFieldKey } from '@/lib/form-field-keys'

type FormFieldRowData = {
  blockType?: string | null
  label?: string | null
  name?: string | null
}

const TYPE_FALLBACK: Record<string, string> = {
  checkbox: 'Zaškrtávací políčko',
  date: 'Datum',
  email: 'Email',
  message: 'Textový blok',
  number: 'Číslo',
  radio: 'Výběr z možností (Radio button)',
  select: 'Výběr z menu (Dropdown)',
  text: 'Textové pole',
  textarea: 'Dlouhé textové pole',
  workshops: 'Výběr z Workshopů',
}

/** Collapsed form field row — label + copyable `{{name}}` tag for email templates. */
export function FormFieldRowLabel() {
  const { data, rowNumber } = useRowLabel<FormFieldRowData>()
  const label = typeof data?.label === 'string' ? data.label.trim() : ''
  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  const typeKey = typeof data?.blockType === 'string' ? data.blockType : ''
  const fallback =
    TYPE_FALLBACK[typeKey] || typeKey || `Pole ${String(rowNumber ?? 0).padStart(2, '0')}`
  const tagKey = name || (label ? formFieldKey(label, typeKey || 'field') : '')
  const tag = tagKey ? `{{${tagKey}}}` : ''

  const copyTag = useCallback(
    (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!tag || !navigator.clipboard?.writeText) return
      void navigator.clipboard.writeText(tag)
    },
    [tag],
  )

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      <span>{label || fallback}</span>
      {tag ? (
        <button
          onClick={copyTag}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.75rem',
            lineHeight: 1.2,
            padding: '0.15rem 0.4rem',
            border: '1px solid currentColor',
            borderRadius: '0.25rem',
            background: 'transparent',
            color: 'inherit',
            cursor: 'copy',
            opacity: 0.75,
          }}
          title="Kopírovat do schránky"
          type="button"
        >
          {tag}
        </button>
      ) : null}
    </span>
  )
}
