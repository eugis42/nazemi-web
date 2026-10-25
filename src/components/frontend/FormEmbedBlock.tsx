'use client'

import { useRef } from 'react'

import { useOpenForm } from '@/components/frontend/FormModalProvider'
import type { FormDoc, FormEmbedFields } from '@/lib/form-types'

function formIdFrom(value: unknown): number | string | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

function asFormDoc(value: unknown): FormDoc | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null
  const id = (value as { id?: unknown }).id
  if (typeof id !== 'number' && typeof id !== 'string') return null
  return value as FormDoc
}

/** Vztahy-style banner → modal form (shared FormModalProvider). */
export function FormEmbedBlockView({
  block,
  siteSlug: _siteSlug = '',
}: {
  block: FormEmbedFields
  siteSlug?: string
}) {
  const title = typeof block.title === 'string' ? block.title.trim() : ''
  const buttonLabel =
    (typeof block.buttonLabel === 'string' && block.buttonLabel.trim()) || 'Vyplnit formulář'
  const description =
    typeof block.description === 'string' && block.description.trim()
      ? block.description.trim()
      : null
  const formId = formIdFrom(block.form)
  const seeded = asFormDoc(block.form)
  const openForm = useOpenForm()
  const hostRef = useRef<HTMLElement>(null)

  if (!formId || !title) return null

  return (
    <section
      className="form-embed-banner not-prose bg-ground/5 p-[15px]"
      data-block="formEmbed"
      ref={hostRef}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
        <span className="font-saans text-card-title leading-snug text-ground">{title}</span>
        {description ? (
          <p className="text-body-inter text-ground/80">{description}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2.5 pt-1">
          <button
            className="btn-outline-ground"
            onClick={() =>
              openForm({
                formId,
                seeded,
                title,
              })
            }
            type="button"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
