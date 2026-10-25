'use client'

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { NazemiForm } from '@/components/frontend/NazemiForm'
import type { FormDoc } from '@/lib/form-types'

export type OpenFormArgs = {
  formId: number | string
  /** Dialog title while loading / if form has no title. */
  title?: string | null
  seeded?: FormDoc | null
}

type FormModalContextValue = {
  openForm: (args: OpenFormArgs) => void
  siteSlug: string
}

const FormModalContext = createContext<FormModalContextValue | null>(null)

export function useOpenForm(): FormModalContextValue['openForm'] {
  const ctx = useContext(FormModalContext)
  if (!ctx) {
    return () => {
      console.warn('useOpenForm: FormModalProvider missing')
    }
  }
  return ctx.openForm
}

export function useFormModalSiteSlug(): string {
  return useContext(FormModalContext)?.siteSlug || ''
}

/** One shared form dialog for CTAs / nav / embed triggers under SiteShell. */
export function FormModalProvider({
  brandStyle,
  children,
  siteSlug = '',
}: {
  /** Site/subsite palette — portal to `<body>` would otherwise lose page-shell vars. */
  brandStyle?: CSSProperties
  children: ReactNode
  siteSlug?: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState<number | null>(null)
  const [formId, setFormId] = useState<number | string | null>(null)
  const [fallbackTitle, setFallbackTitle] = useState('')
  const [form, setForm] = useState<FormDoc | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setOpenedAt(null)
    dialogRef.current?.close()
  }, [])

  const openForm = useCallback((args: OpenFormArgs) => {
    if (args.formId == null || args.formId === '') return
    setFormId(args.formId)
    setFallbackTitle((args.title && String(args.title).trim()) || '')
    setForm(args.seeded?.fields?.length ? args.seeded : args.seeded || null)
    setLoadError(null)
    setOpen(true)
    setOpenedAt(Date.now())

    if (args.seeded?.fields?.length) return

    setLoading(true)
    void (async () => {
      try {
        const res = await fetch(`/api/forms/${args.formId}?depth=1`)
        if (!res.ok) throw new Error('load')
        const json = (await res.json()) as FormDoc
        setForm(json)
      } catch {
        setLoadError('Formulář se nepodařilo načíst.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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

  const value = useMemo(
    () => ({ openForm, siteSlug }),
    [openForm, siteSlug],
  )

  // Prefer caller title (formEmbed banner / CTA label); else form doc title.
  const dialogTitle =
    fallbackTitle || (form?.title && String(form.title).trim()) || 'Formulář'

  const modal =
    mounted && open && formId != null ? (
      createPortal(
        <dialog
          aria-labelledby={titleId}
          aria-modal="true"
          className="nazemi-form-dialog"
          data-component="form-dialog"
          data-site={siteSlug || undefined}
          onClick={(e) => {
            if (e.target === dialogRef.current) close()
          }}
          ref={dialogRef}
          style={brandStyle}
        >
          <div className="nazemi-form-dialog__panel" style={brandStyle}>
            <header className="nazemi-form-dialog__header">
              <h2 className="nazemi-form-dialog__title" id={titleId}>
                {dialogTitle}
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
    <FormModalContext.Provider value={value}>
      {children}
      {modal}
    </FormModalContext.Provider>
  )
}
