/**
 * Lexical plain-text sniffers for admin row labels (array rows, etc.).
 */

const TRIM = 40

export function trimLabel(text: string, max = TRIM): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

function collectText(nodes: unknown[], out: string[]): void {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const n = node as { type?: string; text?: string; children?: unknown[] }
    if (n.type === 'text' && typeof n.text === 'string') out.push(n.text)
    if (Array.isArray(n.children)) collectText(n.children, out)
  }
}

function nodePlainText(node: { children?: unknown[] }): string {
  if (!Array.isArray(node.children)) return ''
  const pieces: string[] = []
  collectText(node.children, pieces)
  return pieces.join('').trim()
}

/** First plain text / heading from Lexical JSON (prefer heading). */
export function lexicalPlainText(content: unknown, max = TRIM): string {
  if (!content || typeof content !== 'object') return ''
  const root = (content as { root?: { children?: unknown[] } }).root
  const children = root?.children
  if (!Array.isArray(children)) return ''

  let heading = ''
  let paragraph = ''

  for (const node of children) {
    if (!node || typeof node !== 'object') continue
    const n = node as { type?: string; children?: unknown[] }
    const text = nodePlainText(n)
    if (!text) continue
    if (n.type === 'heading' && !heading) heading = text
    else if (!paragraph) paragraph = text
    if (heading) break
  }

  return trimLabel(heading || paragraph, max)
}
