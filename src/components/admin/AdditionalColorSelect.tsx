'use client'

import { useEffect, useMemo, useState } from 'react'
import { SelectInput, useField } from '@payloadcms/ui'
import type { OptionObject, TextFieldClientComponent } from 'payload'

import { ADMIN_SITE_COOKIE, MAIN_SITE_SLUG, getCookieValue } from '@/lib/site-context'

type ColorOption = { label?: string | null; value: string }

type ColorSelectOption = OptionObject & { searchLabel: string }

function readSiteSlug() {
  if (typeof document === 'undefined') return MAIN_SITE_SLUG
  return getCookieValue(document.cookie, ADMIN_SITE_COOKIE) || MAIN_SITE_SLUG
}

function normalizeValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (!value.trim() || value === 'none') return ''
  return value
}

function ColorOptionLabel({ color, text }: { color?: string; text: string }) {
  return (
    <span
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        gap: 8,
        lineHeight: 1.2,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          color: color || 'var(--theme-elevation-300)',
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ●
      </span>
      <span>{text}</span>
    </span>
  )
}

/**
 * Payload-native SelectInput colour pick from site.additionalColors.
 * Options show a coloured ● before the label. Clear / empty = „Žádná“.
 */
export const AdditionalColorSelect: TextFieldClientComponent = ({ field, path }) => {
  const { disabled, setValue, showError, value } = useField<string>({ path })
  const allowNone = field.admin?.custom?.allowNone !== false && !field.required
  const [colors, setColors] = useState<ColorOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const slug = readSiteSlug()
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[slug][equals]': slug,
    })

    fetch(`/api/sites?${params}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const list = (data?.docs?.[0]?.additionalColors || []) as ColorOption[]
        setColors(list.filter((c) => typeof c?.value === 'string' && c.value.trim()))
      })
      .catch(() => {
        if (!cancelled) setColors([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const current = normalizeValue(value)

  const options: ColorSelectOption[] = useMemo(
    () =>
      colors.map((color) => {
        const text = color.label || color.value
        return {
          label: <ColorOptionLabel color={color.value} text={text} />,
          searchLabel: text,
          value: color.value,
        }
      }),
    [colors],
  )

  return (
    <div className="field-type select">
      {!loading && !colors.length ? (
        <p style={{ color: 'var(--theme-elevation-400)', margin: '0 0 0.5rem' }}>
          Web nemá Doplňkové barvy — doplňte je ve Weby → Branding.
        </p>
      ) : null}
      <SelectInput
        filterOption={({ data }, search) => {
          if (!search) return true
          const hay = String(
            (data as ColorSelectOption).searchLabel || data.value || '',
          ).toLowerCase()
          return hay.includes(search.toLowerCase())
        }}
        isClearable={allowNone}
        isSortable={false}
        label={field.label}
        name={path}
        onChange={(option) => {
          if (!option || Array.isArray(option)) {
            setValue('')
            return
          }
          setValue(typeof option.value === 'string' ? option.value : '')
        }}
        options={options}
        path={path}
        placeholder="Žádná"
        readOnly={disabled || loading}
        required={field.required}
        showError={showError}
        value={current || undefined}
      />
    </div>
  )
}
