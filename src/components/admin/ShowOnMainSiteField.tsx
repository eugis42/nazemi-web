'use client'

import { useEffect, useState } from 'react'
import { CheckboxField, useField, useFormFields } from '@payloadcms/ui'
import type { CheckboxFieldClientComponent } from 'payload'

import { MAIN_SITE_SLUG } from '@/lib/site-context'

type Visibility = 'pending' | 'hidden' | 'shown'

function siteLooksLikeSubsite(site: unknown): boolean | null {
  if (site == null || site === '') return null
  if (typeof site === 'object') {
    const doc = site as { id?: number | string; siteType?: string; slug?: string }
    if (doc.siteType === 'main' || doc.slug === MAIN_SITE_SLUG) return false
    if (doc.siteType === 'subsite') return true
    if (doc.slug && doc.slug !== MAIN_SITE_SLUG) return true
    return null
  }
  return null
}

function siteIdOf(site: unknown): null | number | string {
  if (site == null || site === '') return null
  if (typeof site === 'number' || typeof site === 'string') return site
  if (typeof site === 'object' && site !== null && 'id' in site) {
    return (site as { id: number | string }).id
  }
  return null
}

/**
 * “Zobrazit i na hlavním webu” — only when selected Web is a sub-web.
 * Clears the value when switching to the main web (after site type is known).
 */
export const ShowOnMainSiteField: CheckboxFieldClientComponent = (props) => {
  const site = useFormFields(([fields]) => fields.site?.value)
  const { setValue, value } = useField<boolean>({ path: props.path })
  const [visibility, setVisibility] = useState<Visibility>('pending')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const quick = siteLooksLikeSubsite(site)
      if (quick === true) {
        if (!cancelled) setVisibility('shown')
        return
      }
      if (quick === false) {
        if (!cancelled) setVisibility('hidden')
        return
      }

      const id = siteIdOf(site)
      if (id == null) {
        if (!cancelled) setVisibility('hidden')
        return
      }

      // Keep pending while fetching — never clear showOnMainSite during load.
      if (!cancelled) setVisibility('pending')

      try {
        const res = await fetch(`/api/sites/${id}?depth=0`, { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setVisibility('hidden')
          return
        }
        const data = (await res.json()) as { siteType?: string; slug?: string }
        const isSub =
          data.siteType === 'subsite' ||
          (Boolean(data.slug) && data.slug !== MAIN_SITE_SLUG)
        if (!cancelled) setVisibility(isSub ? 'shown' : 'hidden')
      } catch {
        if (!cancelled) setVisibility('hidden')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [site])

  useEffect(() => {
    // Only clear after we know the site is main / empty — not while pending.
    if (visibility === 'hidden' && value) {
      setValue(false)
    }
  }, [setValue, value, visibility])

  if (visibility !== 'shown') return null

  return <CheckboxField {...props} />
}
