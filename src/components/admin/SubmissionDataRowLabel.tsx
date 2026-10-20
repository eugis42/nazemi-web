'use client'

import { useRowLabel } from '@payloadcms/ui'

import { useSubmissionFieldLabels } from '@/lib/form-labels-client'

type SubmissionRow = {
  field?: string | null
  value?: string | null
}

/** Collapsed row header = Štítek (not machine `field` key). */
export function SubmissionDataRowLabel() {
  const { data, rowNumber } = useRowLabel<SubmissionRow>()
  const labels = useSubmissionFieldLabels()
  const field = typeof data?.field === 'string' ? data.field.trim() : ''
  const n = String((rowNumber ?? 0) + 1).padStart(2, '0')
  const label = (field && labels[field]) || field || `Údaj ${n}`
  return <span>{label}</span>
}
