import { foldDiacritics } from './diacritics'

/**
 * Drop-in for Payload `wordBoundariesRegex` used by relationship selects.
 * Matches labels diacritic-insensitively so “kalendar” hits “Kalendář”.
 */
export function foldWordBoundariesRegex(searchFilter: string): RegExp {
  const foldedSearch = foldDiacritics(searchFilter || '')
  return {
    test(value: string) {
      if (!foldedSearch) return true
      return foldDiacritics(String(value)).includes(foldedSearch)
    },
  } as RegExp
}
