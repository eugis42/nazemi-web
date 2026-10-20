'use client'

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { NazemiForm } from '@/components/frontend/NazemiForm'
import type { FormDoc, FormEmbedFields } from '@/lib/form-types'

const BRAND_VARS = ['--color-ground', '--color-sky', '--color-green'] as const

function readBrandVars(el: Element | null): CSSProperties {
  if (!el) return {}
  const cs = getComputedStyle(el)
  const style: Record<string, string> = {}
  for (const name of BRAND_VARS) {
    const value = cs.getPropertyValue(name).trim()
    if (value) style[name] = value
  }
  return style as CSSProperties
}

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

/** Vztahy-style banner → modal form (Form Builder). */
export function FormEmbedBlockView({
  block,
  siteSlug = '',
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

  const hostRef = useRef<HTMLElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState<number | null>(null)
  const [form, setForm] = useState<FormDoc | null>(seeded)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setOpenedAt(null)
    dialogRef.current?.close()
    triggerRef.current?.focus()
  }, [])

  const openModal = useCallback(async () => {
    if (!formId) return
    setPortalStyle(readBrandVars(hostRef.current))
    setOpen(true)
    setOpenedAt(Date.now())
    setLoadError(null)

    if (form?.fields?.length) return

    setLoading(true)
    try {
      const res = await fetch(`/api/forms/${formId}?depth=1`)
      if (!res.ok) throw new Error('load')
      const json = (await res.json()) as FormDoc
      setForm(json)
    } catch {
      setLoadError('Formulář se nepodařilo načíst.')
    } finally {
      setLoading(false)
    }
  }, [form, formId])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const onCancel = (event: Event) => {
      event.preventDefault()
      close()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [open, close])

  if (!formId || !title) return null

  const modal =
    mounted && open ? (
      createPortal(
        <dialog
          aria-labelledby={titleId}
          aria-modal="true"
          className="nazemi-form-dialog"
          data-component="form-dialog"
          onClick={(e) => {
            if (e.target === dialogRef.current) close()
          }}
          ref={dialogRef}
          style={portalStyle}
        >
          <div className="nazemi-form-dialog__panel">
            <header className="nazemi-form-dialog__header">
              <h2 className="nazemi-form-dialog__title" id={titleId}>
                {title}
              </h2>
              <button
                aria-label="Zavřít"
                className="nazemi-form-dialog__close"
                onClick={close}
                type="button"
              >
                ×
              </button>
            </header>
            <div className="nazemi-form-dialog__body">
              {loading ? (
                <p className="px-5 py-5 text-body-inter text-ground/70">Načítám formulář…</p>
              ) : null}
              {loadError ? (
                <p className="nazemi-form__summary" role="alert">
                  {loadError}
                </p>
              ) : null}
              {form && openedAt && !loading ? (
                <NazemiForm form={form} openedAt={openedAt} siteSlug={siteSlug} />
              ) : null}
            </div>
          </div>
        </dialog>,
        document.body,
      )
    ) : null

  return (
    <>
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
              onClick={() => void openModal()}
              ref={triggerRef}
              type="button"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </section>
      {modal}
    </>
  )
}
