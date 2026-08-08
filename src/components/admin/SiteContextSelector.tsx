'use client'

import { SelectInput } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import type { OptionObject } from 'payload'
import { useMemo, useTransition } from 'react'

type SiteOption = {
  id: number | string
  name: string
  slug: string
}

export function SiteContextSelector({
  activeSiteSlug,
  sites,
}: {
  activeSiteSlug: string
  sites: SiteOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const options: OptionObject[] = useMemo(
    () => sites.map((site) => ({ label: site.name, value: site.slug })),
    [sites],
  )

  const handleChange = async (nextSiteSlug: string) => {
    await fetch('/api/admin-site', {
      body: JSON.stringify({ siteSlug: nextSiteSlug }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    startTransition(() => {
      router.refresh()
    })
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
      readOnly={isPending}
      value={activeSiteSlug}
    />
  )
}
