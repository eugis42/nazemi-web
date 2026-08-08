'use client'

import { useCallback } from 'react'
import {
  CheckboxField,
  useDocumentInfo,
  useField,
  useFormFields,
} from '@payloadcms/ui'
import type { CheckboxFieldClientComponent } from 'payload'

function siteIdOf(site: unknown): null | number | string {
  if (site == null || site === '') return null
  if (typeof site === 'number' || typeof site === 'string') return site
  if (typeof site === 'object' && site !== null && 'id' in site) {
    return (site as { id: number | string }).id
  }
  return null
}

/**
 * Domovská stránka — when enabling, confirm if another homepage already exists for the site.
 * CheckboxField applies the value first; we revert if the editor cancels.
 * Server hook demotes the previous homepage and migrates empty `content` from `homepageContent`.
 */
export const IsHomepageField: CheckboxFieldClientComponent = (props) => {
  const { setValue } = useField<boolean>({ path: props.path })
  const site = useFormFields(([fields]) => fields.site?.value)
  const { id } = useDocumentInfo()

  const onChange = useCallback(
    async (checked: boolean) => {
      if (!checked) return

      const siteId = siteIdOf(site)
      if (siteId == null) return

      try {
        const params = new URLSearchParams()
        params.set('depth', '0')
        params.set('limit', '5')
        params.set('pagination', 'false')
        params.set('where[and][0][isHomepage][equals]', 'true')
        params.set('where[and][1][site][equals]', String(siteId))
        if (id != null) {
          params.set('where[and][2][id][not_equals]', String(id))
        }

        const res = await fetch(`/api/stranky?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok) return

        const data = (await res.json()) as {
          docs?: { id: number | string; title?: string | null }[]
        }
        const other = data.docs?.[0]
        if (!other) return

        const title = other.title?.trim() || `#${other.id}`
        const ok = window.confirm(
          `Na tomto webu už je domovská stránka „${title}“.\n\n` +
            'Nastavením této stránky jako domovské se předchozí odznačí. ' +
            'Pokud nemá běžný obsah, zkopíruje se do něj obsah homepage.\n\n' +
            'Pokračovat?',
        )
        if (!ok) setValue(false)
      } catch {
        // Network fail — keep toggle; server guard remains.
      }
    },
    [id, setValue, site],
  )

  return (
    <CheckboxField
      {...props}
      onChange={(checked) => {
        void onChange(Boolean(checked))
      }}
    />
  )
}
