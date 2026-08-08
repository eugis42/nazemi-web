/** Lower priority number = ranked higher in search results. */

function eventEndMs(doc: { endDate?: string | null; startDate?: string | null }) {
  const end = doc.endDate || doc.startDate
  if (!end) return null
  const ms = new Date(end).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function searchPriorityForDoc(
  collection: string,
  doc: {
    endDate?: string | null
    publishedAt?: string | null
    startDate?: string | null
  },
): number {
  switch (collection) {
    case 'aktuality': {
      // Fresher news ranks higher (base 10 → older bump).
      const published = doc.publishedAt ? new Date(doc.publishedAt).getTime() : NaN
      if (Number.isNaN(published)) return 22
      const ageDays = Math.max(0, (Date.now() - published) / (1000 * 60 * 60 * 24))
      return 10 + Math.min(25, Math.floor(ageDays / 14))
    }
    case 'kalendar': {
      // Upcoming before past; still near news band when upcoming.
      const end = eventEndMs(doc)
      const past = end != null && end < Date.now()
      return past ? 48 : 12
    }
    case 'workshopy':
      return 20
    case 'publikace':
      return 25
    case 'projekty':
      return 30
    case 'stranky':
      return 40
    default:
      return 50
  }
}

export const searchDefaultPriorities = {
  aktuality: (doc: { publishedAt?: string | null }) => searchPriorityForDoc('aktuality', doc),
  kalendar: (doc: { endDate?: string | null; startDate?: string | null }) =>
    searchPriorityForDoc('kalendar', doc),
  workshopy: 20,
  publikace: 25,
  projekty: 30,
  stranky: 40,
}
