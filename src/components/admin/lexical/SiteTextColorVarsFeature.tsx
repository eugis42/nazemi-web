'use client'

import { useEffect } from 'react'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useDocumentInfo } from '@payloadcms/ui'

import {
  TEXT_COLOR_EXTRA_SLOTS,
  additionalColorsToCssVars,
} from '@/lib/lexical-text-color'

type SitePalette = {
  accentColor?: string | null
  additionalColors?: { value?: string | null }[] | null
  primaryBackgroundColor?: string | null
  primaryColor?: string | null
}

function siteIdOf(site: unknown): null | number | string {
  if (site == null || site === '') return null
  if (typeof site === 'number' || typeof site === 'string') return site
  if (typeof site === 'object' && site !== null && 'id' in site) {
    return (site as { id: number | string }).id
  }
  return null
}

function clearAdminTextColorVars() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.removeProperty('--color-ground')
  root.style.removeProperty('--color-sky')
  root.style.removeProperty('--color-green')
  for (let i = 0; i < TEXT_COLOR_EXTRA_SLOTS; i += 1) {
    root.style.removeProperty(`--color-extra-${i}`)
    root.removeAttribute(`data-nazemi-extra-${i}`)
  }
  root.removeAttribute('data-nazemi-extras')
}

function applyAdminTextColorVars(site: SitePalette) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (site.primaryColor?.trim()) {
    root.style.setProperty('--color-ground', site.primaryColor.trim())
  }
  if (site.primaryBackgroundColor?.trim()) {
    root.style.setProperty('--color-sky', site.primaryBackgroundColor.trim())
  }
  if (site.accentColor?.trim()) {
    root.style.setProperty('--color-green', site.accentColor.trim())
  }

  const extras = additionalColorsToCssVars(site.additionalColors)
  let count = 0
  for (let i = 0; i < TEXT_COLOR_EXTRA_SLOTS; i += 1) {
    const key = `--color-extra-${i}`
    const value = extras[key]
    if (value) {
      root.style.setProperty(key, value)
      root.setAttribute(`data-nazemi-extra-${i}`, '1')
      count = i + 1
    } else {
      root.style.removeProperty(key)
      root.removeAttribute(`data-nazemi-extra-${i}`)
    }
  }
  root.setAttribute('data-nazemi-extras', String(count))
}

/**
 * Reads **saved** document `site` (not live dirty form) and paints CSS vars for
 * TextStateFeature swatches. Re-runs when savedDocumentData updates after save.
 * When editing a Site doc itself, use that document as the palette source.
 */
function SiteTextColorVarsPlugin() {
  const { collectionSlug, savedDocumentData } = useDocumentInfo()
  const siteRef =
    collectionSlug === 'sites' ? savedDocumentData : savedDocumentData?.site

  useEffect(() => {
    let cancelled = false

    if (collectionSlug === 'sites' && siteRef && typeof siteRef === 'object') {
      applyAdminTextColorVars(siteRef as SitePalette)
      return () => {
        cancelled = true
      }
    }

    const siteId = siteIdOf(siteRef)

    if (siteId == null) {
      clearAdminTextColorVars()
      return () => {
        cancelled = true
      }
    }

    // Already populated site object from depth ≥ 0?
    if (siteRef && typeof siteRef === 'object' && 'primaryColor' in siteRef) {
      applyAdminTextColorVars(siteRef as SitePalette)
      return () => {
        cancelled = true
      }
    }

    const params = new URLSearchParams({ depth: '0' })
    fetch(`/api/sites/${siteId}?${params}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((site: SitePalette | null) => {
        if (cancelled || !site) return
        applyAdminTextColorVars(site)
      })
      .catch(() => {
        if (!cancelled) clearAdminTextColorVars()
      })

    return () => {
      cancelled = true
    }
  }, [collectionSlug, siteRef])

  useEffect(() => () => clearAdminTextColorVars(), [])

  return null
}

export const SiteTextColorVarsFeatureClient = createClientFeature(() => ({
  plugins: [
    {
      Component: SiteTextColorVarsPlugin,
      position: 'normal',
    },
  ],
}))
