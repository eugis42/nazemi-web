'use client'

import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import {
  type FormEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { CheckIcon } from '@/components/frontend/icons'
import { TagGroup } from '@/components/frontend/ui'
import { FORM_HONEYPOT_NAME } from '@/lib/form-bot-guard'
import type { FormDoc, FormFieldBlock } from '@/lib/form-types'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

type FieldErrorMap = Record<string, string>
type FormValue = string | boolean | string[]
type WorkshopOption = {
  coverAlt?: string
  coverUrl?: string | null
  id: string | number
  tags?: string[]
  title: string
}

function fieldKey(field: FormFieldBlock, index: number) {
  return field.name || field.id || `field-${index}`
}

function RequiredHint() {
  return <span className="nazemi-form__req">(Povinné)</span>
}

function FieldPopis({ text }: { text?: string | null }) {
  const popis = typeof text === 'string' ? text.trim() : ''
  if (!popis) return null
  return <p className="nazemi-form__popis">{popis}</p>
}

/** Scroll dialog body (not window) — scrollIntoView is flaky inside <dialog>. */
function scrollToFirstError(
  baseId: string,
  fields: FormFieldBlock[],
  errors: FieldErrorMap,
) {
  const first = fields.find((f) => f.name && errors[f.name])
  if (!first?.name) return
  const anchor = document.getElementById(`${baseId}-${first.name}-field`)
  if (!anchor) return

  const scroller = anchor.closest('.nazemi-form-dialog__body')
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'

  if (scroller instanceof HTMLElement) {
    const sRect = scroller.getBoundingClientRect()
    const aRect = anchor.getBoundingClientRect()
    const nextTop = scroller.scrollTop + (aRect.top - sRect.top) - 8
    scroller.scrollTo({ top: Math.max(0, nextTop), behavior })
  } else {
    anchor.scrollIntoView({ behavior, block: 'start' })
  }

  const focusable = anchor.querySelector<HTMLElement>(
    'input:not([type="hidden"]), select, textarea',
  )
  focusable?.focus({ preventScroll: true })
}

function initialValues(fields: FormFieldBlock[]): Record<string, FormValue> {
  const values: Record<string, FormValue> = {}
  for (const field of fields) {
    if (!field.name) continue
    switch (field.blockType) {
      case 'checkbox':
        values[field.name] = Boolean(field.defaultValue)
        break
      case 'workshops':
        values[field.name] = []
        break
      case 'message':
        break
      default:
        values[field.name] =
          field.defaultValue === null || field.defaultValue === undefined
            ? ''
            : String(field.defaultValue)
    }
  }
  return values
}

function validateFields(
  fields: FormFieldBlock[],
  values: Record<string, FormValue>,
): FieldErrorMap {
  const errors: FieldErrorMap = {}
  for (const field of fields) {
    if (!field.name || field.blockType === 'message') continue
    const value = values[field.name]
    if (!field.required) continue
    if (field.blockType === 'checkbox') {
      if (!value) errors[field.name] = 'Toto pole je povinné.'
      continue
    }
    if (field.blockType === 'workshops') {
      if (!Array.isArray(value) || value.length === 0) {
        errors[field.name] = 'Toto pole je povinné.'
      }
      continue
    }
    if (typeof value !== 'string' || !value.trim()) {
      errors[field.name] = 'Toto pole je povinné.'
    }
  }
  return errors
}

function serializeFieldValue(
  field: FormFieldBlock,
  raw: FormValue | undefined,
  workshops: WorkshopOption[],
): string {
  if (field.blockType === 'checkbox') return raw ? 'true' : 'false'
  if (field.blockType === 'workshops') {
    const ids = Array.isArray(raw) ? raw.map(String) : []
    const idSet = new Set(ids)
    return workshops
      .filter((w) => idSet.has(String(w.id)))
      .map((w) => w.title)
      .join(', ')
  }
  return String(raw ?? '')
}

function redirectHref(form: FormDoc, siteSlug: string): string | null {
  const redirect = form.redirect
  if (!redirect) return null
  if (redirect.type === 'custom' && typeof redirect.url === 'string' && redirect.url.trim()) {
    return redirect.url.trim()
  }
  const ref = redirect.reference
  if (!ref || typeof ref !== 'object') return null
  const value = ref.value
  const slug =
    value && typeof value === 'object' && value !== null && 'slug' in value
      ? String(value.slug || '')
      : ''
  if (!slug) return null
  const path = slug === 'home' ? '/' : `/${slug}`
  if (!siteSlug || siteSlug === MAIN_SITE_SLUG) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}site=${encodeURIComponent(siteSlug)}`
}

export function NazemiForm({
  form,
  openedAt,
  siteSlug = '',
  onSuccess,
}: {
  form: FormDoc
  openedAt: number
  siteSlug?: string
  onSuccess?: () => void
}) {
  const baseId = useId()
  const fields = useMemo(
    () => (Array.isArray(form.fields) ? form.fields : []),
    [form.fields],
  )
  const [values, setValues] = useState(() => initialValues(fields))
  const [errors, setErrors] = useState<FieldErrorMap>({})
  const [honeypot, setHoneypot] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState<unknown | null>(null)
  const [workshopOptions, setWorkshopOptions] = useState<WorkshopOption[]>([])
  const [workshopsLoad, setWorkshopsLoad] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  )
  const scrollErrorsRef = useRef(false)

  const needsWorkshops = useMemo(
    () => fields.some((f) => f.blockType === 'workshops'),
    [fields],
  )

  useEffect(() => {
    if (!needsWorkshops) return
    let cancelled = false
    setWorkshopsLoad('loading')
    const q = siteSlug ? `?site=${encodeURIComponent(siteSlug)}` : ''
    void fetch(`/api/form-workshops${q}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load'))))
      .then((json: { docs?: WorkshopOption[] }) => {
        if (cancelled) return
        setWorkshopOptions(Array.isArray(json.docs) ? json.docs : [])
        setWorkshopsLoad('done')
      })
      .catch(() => {
        if (cancelled) return
        setWorkshopOptions([])
        setWorkshopsLoad('error')
      })
    return () => {
      cancelled = true
    }
  }, [needsWorkshops, siteSlug])

  // After error DOM paints (messages change height), scroll dialog body to first invalid.
  useLayoutEffect(() => {
    if (!scrollErrorsRef.current) return
    if (!Object.keys(errors).length) return
    scrollErrorsRef.current = false
    scrollToFirstError(baseId, fields, errors)
  }, [errors, baseId, fields])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSummary(null)
    const nextErrors = validateFields(fields, values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setSummary('Zkontrolujte prosím zvýrazněná pole.')
      scrollErrorsRef.current = true
      return
    }

    const submissionData = fields
      .filter((f) => f.name && f.blockType !== 'message')
      .map((f) => ({
        field: f.name as string,
        value: serializeFieldValue(f, values[f.name as string], workshopOptions),
      }))

    setBusy(true)
    try {
      const res = await fetch('/api/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: form.id,
          honeypot,
          openedAt,
          submissionData,
        }),
      })

      if (res.status === 204) {
        setDoneMessage({ root: { children: [] } })
        onSuccess?.()
        return
      }

      const json = (await res.json().catch(() => null)) as {
        confirmationMessage?: unknown
        confirmationType?: string
        error?: string
        redirect?: FormDoc['redirect']
      } | null

      if (!res.ok) {
        setSummary(json?.error || 'Odeslání se nezdařilo. Zkuste to prosím znovu.')
        return
      }

      if (json?.confirmationType === 'redirect') {
        const href = redirectHref(
          { ...form, redirect: json.redirect ?? form.redirect },
          siteSlug,
        )
        if (href) {
          window.location.assign(href)
          return
        }
      }

      setDoneMessage(json?.confirmationMessage ?? null)
      onSuccess?.()
    } catch {
      setSummary('Odeslání se nezdařilo. Zkuste to prosím znovu.')
    } finally {
      setBusy(false)
    }
  }

  if (doneMessage !== null) {
    return (
      <div className="nazemi-form__success" data-component="form-success" role="status">
        {doneMessage && typeof doneMessage === 'object' ? (
          <div className="prose-nazemi">
            <PayloadRichText data={doneMessage as never} />
          </div>
        ) : (
          <p className="text-body-inter text-ground">Děkujeme za odeslání.</p>
        )}
      </div>
    )
  }

  const submitLabel = form.submitButtonLabel?.trim() || 'Odeslat'

  return (
    <form className="nazemi-form" data-component="nazemi-form" noValidate onSubmit={onSubmit}>
      {summary ? (
        <div className="nazemi-form__summary" role="alert">
          {summary}
        </div>
      ) : null}

      <div className="nazemi-form__fields">
        {fields.map((field, index) => {
          if (field.blockType === 'message') {
            return (
              <div
                className="nazemi-form__message prose-nazemi"
                key={fieldKey(field, index)}
              >
                {field.message ? <PayloadRichText data={field.message as never} /> : null}
              </div>
            )
          }

          if (!field.name) return null
          const id = `${baseId}-${field.name}`
          const errorId = `${id}-error`
          const error = errors[field.name]
          const invalid = Boolean(error)
          const label = field.label?.trim() || field.name

          const fieldAnchorId = `${id}-field`
          const req = field.required ? <RequiredHint /> : null

          if (field.blockType === 'checkbox') {
            return (
              <div
                className="nazemi-form__field nazemi-form__field--checkbox"
                data-invalid={invalid || undefined}
                id={fieldAnchorId}
                key={fieldKey(field, index)}
              >
                <div className="nazemi-form__checkbox-row">
                  <label className="nazemi-form__label" htmlFor={id}>
                    {label}
                    {req}
                  </label>
                  <input
                    aria-describedby={invalid ? errorId : undefined}
                    aria-invalid={invalid || undefined}
                    aria-required={field.required || undefined}
                    checked={Boolean(values[field.name])}
                    className="nazemi-form__checkbox nazemi-form__checkbox--end"
                    disabled={busy}
                    id={id}
                    name={field.name}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.name as string]: e.target.checked }))
                    }
                    type="checkbox"
                  />
                </div>
                <FieldPopis text={field.description} />
                {error ? (
                  <p className="nazemi-form__error" id={errorId}>
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }

          if (field.blockType === 'radio') {
            const options = field.options || []
            return (
              <fieldset
                aria-describedby={invalid ? errorId : undefined}
                aria-invalid={invalid || undefined}
                aria-required={field.required || undefined}
                className="nazemi-form__field nazemi-form__field--radio"
                data-invalid={invalid || undefined}
                disabled={busy}
                id={fieldAnchorId}
                key={fieldKey(field, index)}
              >
                <legend className="nazemi-form__label">
                  {label}
                  {req}
                </legend>
                <FieldPopis text={field.description} />
                <div className="nazemi-form__radios">
                  {options.map((opt) => {
                    const optId = `${id}-${opt.value}`
                    return (
                      <label className="nazemi-form__check" htmlFor={optId} key={opt.value}>
                        <input
                          checked={values[field.name as string] === opt.value}
                          className="nazemi-form__radio"
                          id={optId}
                          name={field.name}
                          onChange={() =>
                            setValues((prev) => ({
                              ...prev,
                              [field.name as string]: opt.value,
                            }))
                          }
                          type="radio"
                          value={opt.value}
                        />
                        <span>{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
                {error ? (
                  <p className="nazemi-form__error" id={errorId}>
                    {error}
                  </p>
                ) : null}
              </fieldset>
            )
          }

          if (field.blockType === 'workshops') {
            const selected = Array.isArray(values[field.name])
              ? (values[field.name] as string[]).map(String)
              : []
            const selectedSet = new Set(selected)
            return (
              <fieldset
                aria-describedby={invalid ? errorId : undefined}
                aria-invalid={invalid || undefined}
                aria-required={field.required || undefined}
                className="nazemi-form__field nazemi-form__field--workshops"
                data-invalid={invalid || undefined}
                disabled={busy}
                id={fieldAnchorId}
                key={fieldKey(field, index)}
              >
                <legend className="nazemi-form__label">
                  {label}
                  {req}
                </legend>
                <FieldPopis text={field.description} />
                {workshopsLoad === 'loading' || workshopsLoad === 'idle' ? (
                  <p className="nazemi-form__hint nazemi-form__hint--pad">Načítám workshopy…</p>
                ) : null}
                {workshopsLoad === 'error' ? (
                  <p className="nazemi-form__error nazemi-form__hint--pad">
                    Workshopy se nepodařilo načíst.
                  </p>
                ) : null}
                {workshopsLoad === 'done' && workshopOptions.length === 0 ? (
                  <p className="nazemi-form__hint nazemi-form__hint--pad">
                    Pro tento web zatím nejsou žádné workshopy.
                  </p>
                ) : null}
                {workshopOptions.length > 0 ? (
                  <div className="nazemi-form__workshop-grid">
                    {workshopOptions.map((opt) => {
                      const optId = `${id}-${opt.id}`
                      const optVal = String(opt.id)
                      const isOn = selectedSet.has(optVal)
                      return (
                        <label
                          className="nazemi-form__workshop-tile"
                          data-selected={isOn || undefined}
                          htmlFor={optId}
                          key={optVal}
                        >
                          <input
                            checked={isOn}
                            className="nazemi-form__workshop-tile-input"
                            id={optId}
                            name={field.name}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selected, optVal]
                                : selected.filter((v) => v !== optVal)
                              setValues((prev) => ({
                                ...prev,
                                [field.name as string]: next,
                              }))
                            }}
                            type="checkbox"
                            value={optVal}
                          />
                          <span className="nazemi-form__workshop-tile-media">
                            {opt.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt=""
                                className="nazemi-form__workshop-tile-img"
                                loading="lazy"
                                src={opt.coverUrl}
                              />
                            ) : null}
                          </span>
                          {isOn ? (
                            <span className="nazemi-form__workshop-tile-check" aria-hidden="true">
                              <CheckIcon className="size-4" />
                            </span>
                          ) : null}
                          <span className="nazemi-form__workshop-tile-body">
                            {opt.tags?.length ? (
                              <TagGroup
                                className="nazemi-form__workshop-tile-tags"
                                muted={false}
                                tags={opt.tags}
                              />
                            ) : null}
                            <span className="nazemi-form__workshop-tile-title">{opt.title}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                ) : null}
                {error ? (
                  <p className="nazemi-form__error nazemi-form__hint--pad" id={errorId}>
                    {error}
                  </p>
                ) : null}
              </fieldset>
            )
          }

          if (field.blockType === 'select') {
            const options = field.options || []
            return (
              <div
                className="nazemi-form__field"
                data-invalid={invalid || undefined}
                id={fieldAnchorId}
                key={fieldKey(field, index)}
              >
                <label className="nazemi-form__label" htmlFor={id}>
                  {label}
                  {req}
                </label>
                <FieldPopis text={field.description} />
                <select
                  aria-describedby={invalid ? errorId : undefined}
                  aria-invalid={invalid || undefined}
                  aria-required={field.required || undefined}
                  className="nazemi-form__control"
                  disabled={busy}
                  id={id}
                  name={field.name}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name as string]: e.target.value }))
                  }
                  value={String(values[field.name] ?? '')}
                >
                  <option value="">{field.placeholder?.trim() || 'Vyberte…'}</option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {error ? (
                  <p className="nazemi-form__error" id={errorId}>
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }

          if (field.blockType === 'textarea') {
            return (
              <div
                className="nazemi-form__field"
                data-invalid={invalid || undefined}
                id={fieldAnchorId}
                key={fieldKey(field, index)}
              >
                <label className="nazemi-form__label" htmlFor={id}>
                  {label}
                  {req}
                </label>
                <FieldPopis text={field.description} />
                <textarea
                  aria-describedby={invalid ? errorId : undefined}
                  aria-invalid={invalid || undefined}
                  aria-required={field.required || undefined}
                  className="nazemi-form__control nazemi-form__textarea"
                  disabled={busy}
                  id={id}
                  name={field.name}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.name as string]: e.target.value }))
                  }
                  rows={4}
                  value={String(values[field.name] ?? '')}
                />
                {error ? (
                  <p className="nazemi-form__error" id={errorId}>
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }

          const inputType =
            field.blockType === 'email'
              ? 'email'
              : field.blockType === 'number'
                ? 'number'
                : field.blockType === 'date'
                  ? 'date'
                  : field.blockType === 'text'
                    ? 'text'
                    : null

          // Unknown block types must not fall through to a blank text input.
          if (!inputType) return null

          return (
            <div
              className="nazemi-form__field"
              data-invalid={invalid || undefined}
              id={fieldAnchorId}
              key={fieldKey(field, index)}
            >
              <label className="nazemi-form__label" htmlFor={id}>
                {label}
                {req}
              </label>
              <FieldPopis text={field.description} />
              <input
                aria-describedby={invalid ? errorId : undefined}
                aria-invalid={invalid || undefined}
                aria-required={field.required || undefined}
                autoComplete={field.blockType === 'email' ? 'email' : undefined}
                className="nazemi-form__control"
                disabled={busy}
                id={id}
                inputMode={field.blockType === 'number' ? 'decimal' : undefined}
                name={field.name}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name as string]: e.target.value }))
                }
                type={inputType}
                value={String(values[field.name] ?? '')}
              />
              {error ? (
                <p className="nazemi-form__error" id={errorId}>
                  {error}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Honeypot — hidden from humans; bots often fill. */}
      <div aria-hidden="true" className="nazemi-form__hp">
        <label htmlFor={`${baseId}-hp`}>
          {FORM_HONEYPOT_NAME}
          <input
            autoComplete="off"
            id={`${baseId}-hp`}
            name={FORM_HONEYPOT_NAME}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            type="text"
            value={honeypot}
          />
        </label>
      </div>

      <div className="nazemi-form__actions">
        <button className="btn-filled-ground" disabled={busy} type="submit">
          {busy ? 'Odesílám…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
