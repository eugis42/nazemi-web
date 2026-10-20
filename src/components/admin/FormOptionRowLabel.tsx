'use client'

import { useRowLabel } from '@payloadcms/ui'

type OptionRowData = {
  label?: string | null
  value?: string | null
}

export function FormOptionRowLabel() {
  const { data, rowNumber } = useRowLabel<OptionRowData>()
  const label = typeof data?.label === 'string' ? data.label.trim() : ''
  const value = typeof data?.value === 'string' ? data.value.trim() : ''
  return <span>{label || value || `Možnost ${String(rowNumber ?? 0).padStart(2, '0')}`}</span>
}
