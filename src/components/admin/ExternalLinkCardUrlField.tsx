'use client'

import { useCallback, useState } from 'react'
import { Button, TextField, useField, useForm } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

type OgPreviewResponse = {
  description?: string | null
  error?: string
  image?: number | string | null
  title?: string | null
  url?: string
}

/**
 * URL field + „Načíst Open Graph“ — fills sibling title / description / image.
 * Public FE never hits this; only admin click.
 */
export const ExternalLinkCardUrlField: TextFieldClientComponent = (props) => {
  const { path, readOnly } = props
  const { setValue, value } = useField<string>({ path })
  const { dispatchFields } = useForm()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const basePath = path.replace(/\.url$/, '')

  const applyOg = useCallback(async () => {
    const url = (typeof value === 'string' ? value : '').trim()
    if (!url) {
      setStatus('Zadejte URL.')
      return
    }

    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/og-preview', {
        body: JSON.stringify({ url }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await res.json()) as OgPreviewResponse
      if (!res.ok) {
        setStatus(data.error || `Chyba ${res.status}`)
        return
      }

      if (typeof data.url === 'string' && data.url && data.url !== url) {
        setValue(data.url)
      }
      if (typeof data.title === 'string' && data.title) {
        dispatchFields({ path: `${basePath}.title`, type: 'UPDATE', value: data.title })
      }
      if (typeof data.description === 'string') {
        dispatchFields({
          path: `${basePath}.description`,
          type: 'UPDATE',
          value: data.description,
        })
      }
      if (data.image != null) {
        dispatchFields({ path: `${basePath}.image`, type: 'UPDATE', value: data.image })
      }
      setStatus(
        data.image != null
          ? 'Open Graph načten (včetně obrázku).'
          : 'Open Graph načten (bez obrázku — doplňte ručně).',
      )
    } catch {
      setStatus('Síťová chyba při načítání Open Graph.')
    } finally {
      setBusy(false)
    }
  }, [basePath, dispatchFields, setValue, value])

  return (
    <div>
      <TextField {...props} />
      <div style={{ marginTop: 8 }}>
        <Button
          buttonStyle="secondary"
          disabled={Boolean(readOnly) || busy || !(typeof value === 'string' && value.trim())}
          onClick={() => void applyOg()}
          size="small"
          type="button"
        >
          {busy ? 'Načítám…' : 'Načíst Open Graph'}
        </Button>
        {status ? (
          <div className="field-description" style={{ marginTop: 6 }}>
            {status}
          </div>
        ) : null}
      </div>
    </div>
  )
}
