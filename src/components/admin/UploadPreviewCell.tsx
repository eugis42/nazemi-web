'use client'

import { Thumbnail, useConfig, useListRelationships, useIntersect } from '@payloadcms/ui'
import { getBestFitFromSizes, isImage } from 'payload/shared'
import type { DefaultCellComponentProps } from 'payload'
import React, { useEffect, useState } from 'react'

/**
 * Upload list cell: thumbnail only (no filename text).
 */
export function UploadPreviewCell({ cellData, field }: DefaultCellComponentProps) {
  const relationTo = 'relationTo' in field ? field.relationTo : undefined
  const { getEntityConfig } = useConfig()
  const [intersectionRef, entry] = useIntersect()
  const { documents, getRelationships } = useListRelationships()
  const [requested, setRequested] = useState(false)

  const isAboveViewport =
    typeof window !== 'undefined'
      ? Boolean(entry?.boundingClientRect && entry.boundingClientRect.top < window.innerHeight)
      : false

  const id =
    typeof cellData === 'number' || typeof cellData === 'string'
      ? cellData
      : cellData && typeof cellData === 'object' && 'id' in cellData
        ? (cellData as { id: number | string }).id
        : null

  const populated = cellData && typeof cellData === 'object' && 'mimeType' in cellData ? cellData : null

  useEffect(() => {
    if (!id || populated || !isAboveViewport || requested || typeof relationTo !== 'string') return
    getRelationships([{ relationTo, value: id }])
    setRequested(true)
  }, [getRelationships, id, isAboveViewport, populated, relationTo, requested])

  useEffect(() => {
    setRequested(false)
  }, [cellData])

  if (id == null || typeof relationTo !== 'string') {
    return <div className="nazemi-upload-preview" ref={intersectionRef as React.RefCallback<HTMLDivElement>} />
  }

  const related = getEntityConfig({ collectionSlug: relationTo })
  const doc =
    populated ||
    (documents?.[relationTo]?.[id] && typeof documents[relationTo][id] === 'object'
      ? documents[relationTo][id]
      : null)

  if (!doc) {
    return (
      <div className="nazemi-upload-preview" ref={intersectionRef as React.RefCallback<HTMLDivElement>}>
        {documents?.[relationTo]?.[id] === false ? null : '…'}
      </div>
    )
  }

  const row = doc as {
    filename?: string
    mimeType?: string
    sizes?: unknown
    thumbnailURL?: string
    updatedAt?: string
    url?: string
    width?: number
  }

  const fileIsImage = isImage(row.mimeType || '')
  let fileSrc: string | undefined = fileIsImage ? row.thumbnailURL || row.url : row.thumbnailURL
  if (fileIsImage) {
    fileSrc = getBestFitFromSizes({
      sizes: row.sizes as never,
      thumbnailURL: row.thumbnailURL || '',
      url: row.url || '',
      width: row.width,
    })
  }

  const uploadConfig = related?.upload
  const imageCacheTag =
    uploadConfig && typeof uploadConfig === 'object' && 'cacheTags' in uploadConfig && uploadConfig.cacheTags
      ? row.updatedAt
      : undefined

  return (
    <div className="nazemi-upload-preview" ref={intersectionRef as React.RefCallback<HTMLDivElement>}>
      <Thumbnail
        className="nazemi-upload-preview__thumb"
        collectionSlug={related?.slug}
        doc={{ ...row, filename: row.filename }}
        fileSrc={fileSrc || undefined}
        imageCacheTag={imageCacheTag}
        size="small"
        uploadConfig={typeof uploadConfig === 'object' ? uploadConfig : undefined}
      />
    </div>
  )
}
