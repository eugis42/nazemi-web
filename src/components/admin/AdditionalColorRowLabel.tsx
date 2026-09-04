'use client'

import { useRowLabel } from '@payloadcms/ui'

type ColorRowData = {
  label?: string | null
  value?: string | null
}

export function AdditionalColorRowLabel() {
  const { data, rowNumber } = useRowLabel<ColorRowData>()
  const name = typeof data?.label === 'string' ? data.label.trim() : ''
  const hex = typeof data?.value === 'string' ? data.value.trim() : ''
  const text = name || hex || `Doplňková barva ${String(rowNumber).padStart(2, '0')}`

  return (
    <span className="flex items-center gap-2">
      {hex ? (
        <span
          aria-hidden
          className="inline-block size-3 shrink-0 rounded-sm border border-black/20"
          style={{ backgroundColor: hex }}
        />
      ) : null}
      {text}
    </span>
  )
}
