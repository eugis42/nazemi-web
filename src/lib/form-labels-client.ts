'use client'

import { useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { formFieldLabelMap } from '@/lib/form-field-labels'

function formIdFromValue(value: unknown): number | string | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/** Module cache — one fetch shared by summary + all row labels. */
const cache = new Map<string, Record<string, string>>()
const inflight = new Map<string, Promise<Record<string, string>>>()

function loadLabels(formId: number | string): Promise<Record<string, string>> {
  const key = String(formId)
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)

  const pending = inflight.get(key)
  if (pending) return pending

  const req = fetch(`/api/forms/${formId}?depth=0`, { credentials: 'include' })
    .then((res) => (res.ok ? res.json() : null))
    .then((doc: { fields?: unknown } | null) => {
      const labels = formFieldLabelMap(doc?.fields)
      cache.set(key, labels)
      inflight.delete(key)
      return labels
    })
    .catch(() => {
      inflight.delete(key)
      return formFieldLabelMap(null)
    })

  inflight.set(key, req)
  return req
}

/** Štítek map for the submission’s related form. */
export function useSubmissionFieldLabels(): Record<string, string> {
  const formRef = useFormFields(([fields]) => fields.form?.value)
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    formFieldLabelMap(null),
  )

  useEffect(() => {
    const id = formIdFromValue(formRef)
    if (id == null) return

    const key = String(id)
    const hit = cache.get(key)
    if (hit) {
      setLabels(hit)
      return
    }

    let cancelled = false
    void loadLabels(id).then((next) => {
      if (!cancelled) setLabels(next)
    })
    return () => {
      cancelled = true
    }
  }, [formRef])

  return labels
}
