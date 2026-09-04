import { describe, expect, it } from 'vitest'

import {
  isAdminRelationPickerFind,
  upcomingEventsWhere,
  withDiacriticInsensitiveTitleSearch,
} from '@/lib/menu-relation-picker'

describe('menu-relation-picker', () => {
  it('detects relationship picker find shape', () => {
    expect(
      isAdminRelationPickerFind({
        depth: 0,
        draft: true,
        limit: 10,
        select: { title: true },
      }),
    ).toBe(true)
    expect(
      isAdminRelationPickerFind({
        depth: 1,
        draft: true,
        limit: 10,
        select: { title: true },
      }),
    ).toBe(false)
    expect(
      isAdminRelationPickerFind({
        depth: 0,
        draft: true,
        limit: 25,
        select: { title: true },
      }),
    ).toBe(false)
  })

  it('builds upcoming where with startDate', () => {
    const now = '2026-09-03T12:00:00.000Z'
    expect(upcomingEventsWhere(now)).toEqual({
      startDate: { greater_than_equal: now },
    })
  })

  it('delegates title fold to shared diacritic search', () => {
    expect(
      withDiacriticInsensitiveTitleSearch({
        and: [{ site: { equals: 1 } }, { title: { like: 'kalendar' } }],
      }),
    ).toEqual({
      and: [
        { site: { equals: 1 } },
        {
          or: [{ title: { like: 'kalendar' } }, { searchFold: { like: 'kalendar' } }],
        },
      ],
    })
  })
})
