import { describe, expect, it } from 'vitest'

import { resolveBlockActions } from '@/lib/block-actions'

describe('resolveBlockActions', () => {
  it('resolves internal page reference to site-scoped path', () => {
    const actions = resolveBlockActions({
      actions: [
        {
          label: 'O nás',
          linkType: 'internal',
          reference: {
            relationTo: 'stranky',
            value: { slug: 'o-nazemi', title: 'O NaZemi' },
          },
          variant: 'outline',
        },
      ],
      siteSlug: 'flowmakers',
    })
    expect(actions).toEqual([
      {
        backgroundColor: null,
        external: false,
        href: '/o-nazemi?site=flowmakers',
        label: 'O nás',
        newTab: undefined,
        variant: 'outline',
      },
    ])
  })

  it('keeps legacy URL rows', () => {
    const actions = resolveBlockActions({
      actions: [{ href: '/aktuality', label: 'Všechny aktuality', variant: 'outline' }],
      siteSlug: 'nazemi',
    })
    expect(actions[0]?.href).toBe('/aktuality')
  })

  it('passes Barevné backgroundColor through', () => {
    const actions = resolveBlockActions({
      actions: [
        {
          backgroundColor: '#bda9ff',
          href: '/o-nazemi',
          label: 'O nás',
          variant: 'colored',
        },
      ],
      siteSlug: 'nazemi',
    })
    expect(actions[0]).toMatchObject({
      backgroundColor: '#bda9ff',
      variant: 'colored',
    })
  })

  it('resolves přehled collection home', () => {
    const actions = resolveBlockActions({
      actions: [
        {
          label: 'Kalendář',
          linkType: 'internal',
          reference: {
            relationTo: 'prehledy',
            value: { collectionKey: 'kalendar', title: 'Kalendář' },
          },
        },
      ],
      siteSlug: 'nazemi',
    })
    expect(actions[0]?.href).toBe('/kalendar')
  })

  it('falls back to reference title when CTA label empty', () => {
    const actions = resolveBlockActions({
      actions: [
        {
          linkType: 'internal',
          reference: {
            relationTo: 'stranky',
            value: { slug: 'o-nas', title: 'O nás' },
          },
          variant: 'outline',
        },
      ],
      siteSlug: 'nazemi',
    })
    expect(actions[0]).toMatchObject({ href: '/o-nas', label: 'O nás' })
  })
})
