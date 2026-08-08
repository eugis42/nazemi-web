/** Recursively collect plain text from Lexical JSON / nested objects. */

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function flattenLexical(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    return value
      .map((item) => flattenLexical(item))
      .filter(Boolean)
      .join(' ')
  }

  if (!isRecord(value)) return ''

  // Lexical text node
  if (typeof value.text === 'string') {
    return value.text
  }

  const parts: string[] = []

  if (Array.isArray(value.children)) {
    parts.push(flattenLexical(value.children))
  }

  // Common Payload/Lexical wrappers
  if (value.root) parts.push(flattenLexical(value.root))
  if (value.content) parts.push(flattenLexical(value.content))

  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function joinSearchText(parts: Array<string | null | undefined>, maxLen = 800): string {
  const text = parts
    .map((part) => (part || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' · ')
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).trim()}…`
}

export function relationId(value: unknown): number | string | null {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (isRecord(value) && 'id' in value) {
    const id = value.id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

export function relationTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isRecord(item)) return ''
      if (typeof item.title === 'string') return item.title
      return ''
    })
    .filter(Boolean)
}
