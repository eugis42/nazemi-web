import type { Block, Field, Tab } from 'payload'

import { withFormEmailDefaults } from '@/lib/form-email-defaults'
import { nazemiNestedLexicalEditor } from '@/lib/lexical-nested-editor'

/**
 * Forms collection richText must NOT use the root Lexical editor (BlocksFeature
 * includes `formEmbed` → forms → richText → formEmbed → … forever). Same
 * pattern as Sloupce / expanding-paragraph nested bodies.
 *
 * Also wires FormFieldRowLabel on the `fields` blocks list + email defaults.
 */
export function withNestedLexicalEditor(field: Field): Field {
  const withEmails = withFormEmailDefaults(field)

  if (withEmails.type === 'richText') {
    return { ...withEmails, editor: nazemiNestedLexicalEditor }
  }

  if (
    (withEmails.type === 'array' ||
      withEmails.type === 'group' ||
      withEmails.type === 'collapsible' ||
      withEmails.type === 'row') &&
    'fields' in withEmails &&
    Array.isArray(withEmails.fields)
  ) {
    return {
      ...withEmails,
      fields: withEmails.fields.map(withNestedLexicalEditor),
    }
  }

  if (withEmails.type === 'tabs' && 'tabs' in withEmails && Array.isArray(withEmails.tabs)) {
    return {
      ...withEmails,
      tabs: withEmails.tabs.map(
        (tab: Tab): Tab => ({
          ...tab,
          fields: Array.isArray(tab.fields)
            ? tab.fields.map(withNestedLexicalEditor)
            : tab.fields,
        }),
      ),
    }
  }

  if (withEmails.type === 'blocks' && 'blocks' in withEmails && Array.isArray(withEmails.blocks)) {
    const next: Field = {
      ...withEmails,
      blocks: withEmails.blocks.map(
        (block: Block): Block => ({
          ...block,
          fields: block.fields.map(withNestedLexicalEditor),
        }),
      ),
    }
    if ('name' in withEmails && withEmails.name === 'fields') {
      // RowLabel works at runtime on blocks (same as Stránky content); types omit it.
      return {
        ...next,
        admin: {
          ...withEmails.admin,
          components: {
            ...withEmails.admin?.components,
            RowLabel: '/components/admin/FormFieldRowLabel#FormFieldRowLabel',
          },
        },
      } as Field
    }
    return next
  }

  return withEmails
}
