import { describe, expect, it } from 'vitest'

import {
  collectionHasSlugField,
  matchingPrehledyKeys,
  withDiacriticInsensitiveSearch,
} from '@/lib/diacritic-admin-search'
import { foldDiacritics } from '@/lib/diacritics'
import { foldWordBoundariesRegex } from '@/lib/fold-word-boundaries'
import { buildSearchFold } from '@/lib/search-fold'

describe('foldDiacritics czech letters', () => {
  it('folds all common czech diacritics', () => {
    expect(foldDiacritics('áäčďéěíňóřšťúůýž')).toBe('aacdeeinorstuuyz')
    expect(foldDiacritics('ÁÄČĎÉĚÍŇÓŘŠŤÚŮÝŽ')).toBe('aacdeeinorstuuyz')
    expect(foldDiacritics('českých')).toBe('ceskych')
    expect(foldDiacritics('školách')).toBe('skolach')
  })
})

describe('buildSearchFold', () => {
  it('joins and folds title fields', () => {
    expect(
      buildSearchFold({ title: 'České školách', excerpt: 'Říjen' }),
    ).toBe('ceske skolach rijen')
  })
})

describe('withDiacriticInsensitiveSearch', () => {
  it('folds slug like terms', () => {
    expect(
      withDiacriticInsensitiveSearch({ slug: { like: 'Kalendář' } }, { hasSlug: true }),
    ).toEqual({ slug: { like: 'kalendar' } })
  })

  it('ors title like with searchFold', () => {
    expect(
      withDiacriticInsensitiveSearch(
        { title: { like: 'ces' } },
        { hasSlug: true, hasSearchFold: true },
      ),
    ).toEqual({
      or: [{ title: { like: 'ces' } }, { searchFold: { like: 'ces' } }],
    })
  })

  it('ors name like with searchFold', () => {
    expect(
      withDiacriticInsensitiveSearch({ name: { like: 'Jiri' } }, { hasSearchFold: true }),
    ).toEqual({
      or: [{ name: { like: 'Jiri' } }, { searchFold: { like: 'jiri' } }],
    })
  })

  it('maps prehledy title search to collectionKey in', () => {
    expect(
      withDiacriticInsensitiveSearch(
        { title: { like: 'Kalendář' } },
        { hasSlug: false, prehledy: true },
      ),
    ).toEqual({
      or: [{ title: { like: 'Kalendář' } }, { collectionKey: { in: ['kalendar'] } }],
    })
  })

  it('matches prehledy keys by folded title', () => {
    expect(matchingPrehledyKeys('kalendar')).toEqual(['kalendar'])
    expect(matchingPrehledyKeys('aktual')).toEqual(['aktuality'])
  })

  it('detects slug fields in nested tabs', () => {
    expect(
      collectionHasSlugField({
        fields: [
          {
            type: 'tabs',
            tabs: [{ fields: [{ name: 'slug', type: 'text' }], label: 'SEO' }],
          },
        ],
      }),
    ).toBe(true)
  })
})

describe('foldWordBoundariesRegex', () => {
  it('matches diacritic labels with ASCII query', () => {
    const r = foldWordBoundariesRegex('ces')
    expect(r.test('českých')).toBe(true)
    expect(r.test('školách')).toBe(false)
    expect(foldWordBoundariesRegex('sko').test('školách')).toBe(true)
  })
})
