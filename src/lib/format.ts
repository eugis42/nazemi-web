const TIME_ZONE = 'Europe/Prague'

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  timeZone: TIME_ZONE,
  year: 'numeric',
})

const dayMonthFormatter = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  timeZone: TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('cs-CZ', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
})

function toDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value?: string | null): string {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : ''
}

export function formatTime(value?: string | null): string {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : ''
}

/** "12. 5. 2026" — or "12. 5. – 14. 5. 2026" when the event spans several days. */
export function formatDateRange(start?: string | null, end?: string | null): string {
  const startDate = toDate(start)
  if (!startDate) return ''

  const endDate = toDate(end)
  if (!endDate || dateFormatter.format(startDate) === dateFormatter.format(endDate)) {
    return dateFormatter.format(startDate)
  }

  return `${dayMonthFormatter.format(startDate)} – ${dateFormatter.format(endDate)}`
}

/** "18:00" — or "18:00 – 20:00" when both ends fall on the same day. */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  const startDate = toDate(start)
  if (!startDate) return ''

  const endDate = toDate(end)
  if (!endDate || dateFormatter.format(startDate) !== dateFormatter.format(endDate)) {
    return timeFormatter.format(startDate)
  }

  return `${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`
}
