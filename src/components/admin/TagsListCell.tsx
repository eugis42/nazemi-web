'use client'

import { getTranslation } from '@payloadcms/translations'
import {
  Pill,
  useConfig,
  useIntersect,
  useListRelationships,
  useTranslation,
} from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import React, { useEffect, useMemo, useState } from 'react'

type RelValue = { relationTo: string; value: number | string }

function asId(item: unknown): number | string | null {
  if (typeof item === 'number' || typeof item === 'string') return item
  if (item && typeof item === 'object' && 'id' in item) {
    const id = (item as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  if (item && typeof item === 'object' && 'value' in item) {
    const value = (item as { value?: unknown }).value
    if (typeof value === 'number' || typeof value === 'string') return value
    if (value && typeof value === 'object' && 'id' in value) {
      const id = (value as { id?: unknown }).id
      if (typeof id === 'number' || typeof id === 'string') return id
    }
  }
  return null
}

function populatedTitle(item: unknown, useAsTitle: string): string | null {
  if (!item || typeof item !== 'object') return null
  if ('relationTo' in item && 'value' in item) {
    return populatedTitle((item as { value: unknown }).value, useAsTitle)
  }
  const title = (item as Record<string, unknown>)[useAsTitle]
  return typeof title === 'string' && title.trim() ? title : null
}

export function TagsListCell({ cellData, field }: DefaultCellComponentProps) {
  const relationTo =
    ('relationTo' in field && field.relationTo) ||
    ('collection' in field && (field as { collection?: string }).collection)

  const { getEntityConfig } = useConfig()
  const [intersectionRef, entry] = useIntersect()
  const { documents, getRelationships } = useListRelationships()
  const { i18n, t } = useTranslation()
  const [requested, setRequested] = useState(false)

  const isAboveViewport =
    typeof window !== 'undefined'
      ? Boolean(entry?.boundingClientRect && entry.boundingClientRect.top < window.innerHeight)
      : false

  const items = useMemo(
    () => (Array.isArray(cellData) ? cellData : cellData != null ? [cellData] : []),
    [cellData],
  )

  const fieldLabel =
    field && 'label' in field ? getTranslation(field.label as never, i18n) : ''

  const useAsTitle =
    typeof relationTo === 'string'
      ? getEntityConfig({ collectionSlug: relationTo })?.admin?.useAsTitle || 'title'
      : 'title'

  useEffect(() => {
    if (!items.length || !isAboveViewport || requested || typeof relationTo !== 'string') return

    const needFetch: RelValue[] = []
    for (const item of items) {
      const id = asId(item)
      if (id == null) continue
      if (populatedTitle(item, useAsTitle)) continue
      needFetch.push({ relationTo, value: id })
    }

    if (needFetch.length) getRelationships(needFetch)
    setRequested(true)
  }, [
    getRelationships,
    isAboveViewport,
    items,
    relationTo,
    requested,
    useAsTitle,
  ])

  useEffect(() => {
    setRequested(false)
  }, [cellData])

  if (!items.length) {
    return (
      <div className="nazemi-tags-cell" ref={intersectionRef}>
        {t('general:noLabel', { label: fieldLabel })}
      </div>
    )
  }

  if (typeof relationTo !== 'string') {
    return <div className="nazemi-tags-cell" ref={intersectionRef} />
  }

  return (
    <div className="nazemi-tags-cell" ref={intersectionRef}>
      {items.map((item, index) => {
        const id = asId(item)
        if (id == null) return null

        const fetched = documents?.[relationTo]?.[id]
        let label = populatedTitle(item, useAsTitle)

        if (!label && fetched && typeof fetched === 'object') {
          const title = (fetched as Record<string, unknown>)[useAsTitle]
          label = typeof title === 'string' ? title : null
        }

        if (fetched === false) {
          label = `${t('general:untitled')} - ID: ${id}`
        } else if (!label && (fetched === null || fetched === undefined)) {
          label = `${t('general:loading')}...`
        } else if (!label) {
          label = `${t('general:untitled')} - ID: ${id}`
        }

        return (
          <Pill
            className="nazemi-tag-pill"
            key={`${relationTo}-${id}-${index}`}
            pillStyle="light"
            rounded
            size="small"
          >
            {label}
          </Pill>
        )
      })}
    </div>
  )
}
