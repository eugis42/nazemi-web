'use client'

import type { CSSProperties, ReactNode } from 'react'

import { useOpenForm } from '@/components/frontend/FormModalProvider'

/** Whole pillar tile opens a form modal. */
export function PillarFormCardClient({
  ariaLabel,
  children,
  formId,
  formTitle,
  style,
}: {
  ariaLabel: string
  children: ReactNode
  formId: number | string
  formTitle: string
  style?: CSSProperties
}) {
  const openForm = useOpenForm()

  return (
    <button
      aria-label={ariaLabel}
      className="card-tile flex flex-col justify-between gap-grid p-card text-left lg:min-h-[482px]"
      data-component="pillar-column"
      onClick={() => openForm({ formId, title: formTitle })}
      style={style}
      type="button"
    >
      {children}
    </button>
  )
}
