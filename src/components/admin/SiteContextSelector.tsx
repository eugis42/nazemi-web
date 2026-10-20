'use client'

import { SelectInput } from '@payloadcms/ui'
import type { OptionObject } from 'payload'
import { useMemo, useState } from 'react'

type SiteOption = {
  id: number | string
  name: string
  slug: string
}

/**
 * Site cookie switcher in `beforeNav`.
 * Hard reload after cookie set — `router.refresh()` + `useTransition` can leave
 * SelectInput stuck on Payload’s pre-mount shimmer when RSC hangs.
 */
export function SiteContextSelector({
  activeSiteSlug,
  sites,
}: {
  activeSiteSlug: string
  sites: SiteOption[]
}) {
  const [busy, setBusy] = useState(false)

  const options: OptionObject[] = useMemo(
    () => sites.map((site) => ({ label: site.name, value: site.slug })),
    [sites],
  )

  const handleChange = async (nextSiteSlug: string) => {
    setBusy(true)
    try {
      await fetch('/api/admin-site', {
        body: JSON.stringify({ siteSlug: nextSiteSlug }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      window.location.reload()
    } catch {
      setBusy(false)
    }
  }

  return (
    <SelectInput
      isClearable={false}
      name="nazemiAdminSite"
      onChange={(option) => {
        if (!option || Array.isArray(option)) {
          return
        }
        const next = String(option.value)
        if (next === activeSiteSlug) {
          return
        }
        void handleChange(next)
      }}
      options={options}
      path="nazemiAdminSite"
      readOnly={busy}
      value={activeSiteSlug}
    />
  )
}
