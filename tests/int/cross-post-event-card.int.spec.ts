import { describe, expect, it } from 'vitest'

import { crossPostOriginSite, siteBrandStyle, withSiteQuery } from '@/lib/content'

describe('crossPostOriginSite', () => {
  const sub = {
    id: 2,
    name: 'NaZemi Brno',
    primaryColor: '#7C3AED',
    primaryBackgroundColor: '#F5F0FF',
    accentColor: '#90d750',
    siteType: 'subsite' as const,
    slug: 'brno',
  }

  it('returns origin site on main for sub-web docs', () => {
    expect(crossPostOriginSite({ currentSiteSlug: 'nazemi', docSite: sub })).toEqual(sub)
  })

  it('returns null on sub-site or main-owned docs', () => {
    expect(crossPostOriginSite({ currentSiteSlug: 'brno', docSite: sub })).toBeNull()
    expect(
      crossPostOriginSite({
        currentSiteSlug: 'nazemi',
        docSite: { id: 1, name: 'NaZemi', siteType: 'main', slug: 'nazemi' },
      }),
    ).toBeNull()
  })
})

describe('siteBrandStyle', () => {
  it('maps primary / background / accent to CSS vars', () => {
    expect(
      siteBrandStyle({
        accentColor: '#90d750',
        primaryBackgroundColor: '#F5F0FF',
        primaryColor: '#7C3AED',
      }),
    ).toEqual({
      '--color-ground': '#7C3AED',
      '--color-sky': '#F5F0FF',
      '--color-green': '#90d750',
    })
  })
})

describe('news card cross-post routing', () => {
  const sub = {
    id: 2,
    name: 'NaZemi Brno',
    primaryColor: '#7C3AED',
    primaryBackgroundColor: '#F5F0FF',
    accentColor: '#90d750',
    siteType: 'subsite' as const,
    slug: 'brno',
  }

  it('routes to origin site slug and applies brand style on main', () => {
    const origin = crossPostOriginSite({ currentSiteSlug: 'nazemi', docSite: sub })
    expect(origin?.slug).toBe('brno')
    expect(withSiteQuery('/aktuality/clanek', origin?.slug || 'nazemi')).toBe(
      '/aktuality/clanek?site=brno',
    )
    expect(siteBrandStyle(origin!)).toMatchObject({
      '--color-ground': '#7C3AED',
      '--color-sky': '#F5F0FF',
    })
  })
})
