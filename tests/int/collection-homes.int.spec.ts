import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearMenuFilterCachesForTests,
  collectionHomePath,
  isCollectionHomeKey,
  menuReferenceFilterOptions,
} from '@/lib/collection-homes'

describe('collection-homes', () => {
  beforeEach(() => {
    clearMenuFilterCachesForTests()
  })
  it('maps keys to listing paths', () => {
    expect(collectionHomePath('aktuality')).toBe('/aktuality')
    expect(collectionHomePath('kalendar')).toBe('/kalendar')
    expect(collectionHomePath('projekty')).toBe('/projekty')
    expect(collectionHomePath('workshopy')).toBe('/workshopy')
    expect(collectionHomePath('publikace')).toBe('/publikace')
  })

  it('guards collection keys', () => {
    expect(isCollectionHomeKey('aktuality')).toBe(true)
    expect(isCollectionHomeKey('nope')).toBe(false)
  })

  it('filterOptions requires editing site id', async () => {
    const req = {
      payload: {
        find: async () => ({ docs: [] }),
        findByID: async () => null,
        create: async () => ({}),
      },
    }
    await expect(
      menuReferenceFilterOptions({
        data: {},
        relationTo: 'aktuality',
        req: req as never,
      }),
    ).resolves.toBe(false)
  })

  it('filterOptions uses data.site on content forms (blocks)', async () => {
    const req = {
      payload: {
        find: async ({ collection }: { collection: string }) => {
          if (collection === 'sites') return { docs: [{ id: 1 }, { id: 2 }] }
          return { docs: [] }
        },
        findByID: async () => ({ id: 1, siteType: 'main', slug: 'nazemi' }),
        create: async () => ({}),
      },
    }

    const where = await menuReferenceFilterOptions({
      data: { id: 99, site: 1, title: 'Domů' },
      relationTo: 'stranky',
      req: req as never,
    })

    expect(where).toEqual({
      and: [{ site: { equals: 1 } }, { site: { in: [1, 2] } }],
    })
  })

  it('filterOptions scopes prehledy to editing site and published webs', async () => {
    const created: unknown[] = []
    const req = {
      payload: {
        find: async ({ collection }: { collection: string }) => {
          if (collection === 'sites') {
            return { docs: [{ id: 1 }, { id: 2 }] }
          }
          if (collection === 'prehledy') {
            return { docs: [] }
          }
          return { docs: [] }
        },
        findByID: async () => ({ id: 1, siteType: 'main', slug: 'nazemi' }),
        create: async (args: unknown) => {
          created.push(args)
          return {}
        },
      },
    }

    const where = await menuReferenceFilterOptions({
      data: { id: 1 },
      relationTo: 'prehledy',
      req: req as never,
    })

    expect(where).toEqual({
      and: [{ site: { equals: 1 } }, { site: { in: [1, 2] } }],
    })
    expect(created).toHaveLength(5)
  })

  it('filterOptions blocks content from draft-only foreign sites on main', async () => {
    const req = {
      payload: {
        find: async ({ collection }: { collection: string }) => {
          if (collection === 'sites') {
            // only main published — draft subweb id 99 absent
            return { docs: [{ id: 1 }] }
          }
          return { docs: [] }
        },
        findByID: async () => ({ id: 1, siteType: 'main', slug: 'nazemi' }),
        create: async () => ({}),
      },
    }

    const where = await menuReferenceFilterOptions({
      data: { id: 1 },
      relationTo: 'aktuality',
      req: req as never,
    })

    expect(where).toEqual({
      and: [
        {
          or: [{ site: { equals: 1 } }],
        },
        { site: { in: [1] } },
      ],
    })
  })
})
