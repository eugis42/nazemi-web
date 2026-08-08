'use client'

import { getTranslation } from '@payloadcms/translations'
import { Pill, useTranslation } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import React from 'react'

type StatusPillStyle = 'light' | 'success' | 'warning'

const PILL_STYLE: Record<string, StatusPillStyle> = {
  published: 'success',
  draft: 'warning',
  changed: 'light',
}

export function StatusCell({ cellData, field }: DefaultCellComponentProps) {
  const { i18n, t } = useTranslation()
  const value = cellData == null || cellData === '' ? 'draft' : String(cellData)

  let label: string = value
  if (field && 'options' in field && Array.isArray(field.options)) {
    const match = field.options.find((opt) =>
      typeof opt === 'object' && opt !== null && 'value' in opt
        ? opt.value === value
        : opt === value,
    )
    if (match && typeof match === 'object' && 'label' in match) {
      label = getTranslation(match.label as Parameters<typeof getTranslation>[0], i18n)
    } else if (value === 'changed') {
      label = t('version:draftHasPublishedVersion')
    }
  } else if (value === 'changed') {
    label = t('version:draftHasPublishedVersion')
  } else if (value === 'published') {
    label = t('version:published')
  } else if (value === 'draft') {
    label = t('version:draft')
  }

  return (
    <Pill
      className={`nazemi-status-pill nazemi-status-pill--${value}`}
      pillStyle={PILL_STYLE[value] ?? 'light'}
      rounded
      size="small"
    >
      {label}
    </Pill>
  )
}
