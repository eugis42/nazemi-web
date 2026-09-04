import { afterEach, describe, expect, it } from 'vitest'

import { MAIN_SITE_SLUG, getFrontendSiteSlug, siteSlugFromHost } from '@/lib/site-context'

describe('siteSlugFromHost', () => {
  const prev = process.env.NEXT_PUBLIC_SERVER_URL

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL
    else process.env.NEXT_PUBLIC_SERVER_URL = prev
  })

  it('treats NEXT_PUBLIC_SERVER_URL host as main site', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://novy.nazemi.cz'
    expect(siteSlugFromHost('novy.nazemi.cz')).toBeNull()
    expect(siteSlugFromHost('www.novy.nazemi.cz')).toBeNull()
    expect(getFrontendSiteSlug({ host: 'novy.nazemi.cz' })).toBe(MAIN_SITE_SLUG)
  })

  it('still maps real sub-web hosts', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://novy.nazemi.cz'
    expect(siteSlugFromHost('brno.nazemi.cz')).toBe('brno')
  })
})
