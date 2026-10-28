import { hasText } from '@payloadcms/richtext-lexical/shared'
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical'

type LexNode = SerializedLexicalNode & {
  children?: LexNode[]
  text?: string
  type: string
}

/** Nodes that carry meaning without text children — never strip. */
const KEEP_TYPES = new Set([
  'block',
  'inlineBlock',
  'upload',
  'relationship',
  'horizontalrule',
  'table',
])

function isWhitespaceOnlyText(node: LexNode): boolean {
  if (node.type === 'linebreak' || node.type === 'tab') return true
  if (node.type === 'text') return !String(node.text ?? '').trim()
  return false
}

function sanitizeNode(node: LexNode): LexNode | null {
  if (KEEP_TYPES.has(node.type)) return node

  if (Array.isArray(node.children)) {
    const children = node.children
      .map((child) => sanitizeNode(child))
      .filter((child): child is LexNode => child != null)

    if (node.type === 'paragraph' || node.type === 'heading') {
      if (!children.length) return null
      if (children.every(isWhitespaceOnlyText)) return null
      return { ...node, children }
    }

    if (node.type === 'listitem') {
      if (!children.length) return null
      if (children.every(isWhitespaceOnlyText)) return null
      return { ...node, children }
    }

    if (node.type === 'list' || node.type === 'quote') {
      if (!children.length) return null
      return { ...node, children }
    }

    if (node.type === 'link' || node.type === 'autolink') {
      if (!children.length) return null
      if (children.every(isWhitespaceOnlyText)) return null
      return { ...node, children }
    }

    return { ...node, children }
  }

  if (isWhitespaceOnlyText(node)) return null
  return node
}

/**
 * Strip empty paragraphs / whitespace-only nodes on save.
 * Fully empty editor → `null` (Payload-recommended; pairs with `hasText`).
 */
export function sanitizeLexicalOnSave(value: unknown): null | SerializedEditorState {
  if (value == null) return null
  if (typeof value !== 'object') return null
  const doc = value as SerializedEditorState
  if (!doc.root || !Array.isArray(doc.root.children)) return doc

  const children = (doc.root.children as LexNode[])
    .map((child) => sanitizeNode(child))
    .filter((child): child is LexNode => child != null)

  const next = {
    ...doc,
    root: {
      ...doc.root,
      children,
    },
  } as SerializedEditorState

  if (!hasText(next) && !children.some((c) => KEEP_TYPES.has(c.type))) {
    return null
  }

  return next
}
