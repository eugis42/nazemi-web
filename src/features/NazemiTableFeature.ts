import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import {
  convertLexicalNodesToHTML,
  createNode,
  createServerFeature,
} from '@payloadcms/richtext-lexical'
import { sanitizeFields } from 'payload'

/**
 * Lexical tables — stock TableFeatureClient (Turbopack-safe) + Czech field labels.
 * Toolbar/slash/drawer title Czech-ified by NazemiTableCsFeature plugin.
 * Keep key `experimental_table` so FieldsDrawer schema path matches client.
 */
export const NazemiTableFeature = createServerFeature({
  feature: async ({ config, isRoot, parentIsLocalized }) => {
    const validRelationships = config.collections.map((c) => c.slug) || []
    const sanitizedFields = await sanitizeFields({
      config: config as Parameters<typeof sanitizeFields>[0]['config'],
      fields: [
        {
          name: 'rows',
          type: 'number',
          defaultValue: 5,
          label: 'Řádky',
          required: true,
        },
        {
          name: 'columns',
          type: 'number',
          defaultValue: 5,
          label: 'Sloupce',
          required: true,
        },
      ],
      parentIsLocalized,
      requireFieldLevelRichTextEditor: isRoot,
      validRelationships,
    })

    return {
      ClientFeature: '@payloadcms/richtext-lexical/client#TableFeatureClient',
      generateSchemaMap: () => {
        const schemaMap = new Map()
        schemaMap.set('fields', { fields: sanitizedFields })
        return schemaMap
      },
      i18n: {
        cs: { label: 'Tabulka' },
        en: { label: 'Tabulka' },
      },
      nodes: [
        createNode({
          converters: {
            html: {
              converter: async ({
                converters,
                currentDepth,
                depth,
                draft,
                node,
                overrideAccess,
                parent,
                req,
                showHiddenFields,
              }) => {
                const childrenText = await convertLexicalNodesToHTML({
                  converters,
                  currentDepth,
                  depth,
                  draft,
                  lexicalNodes: node.children,
                  overrideAccess,
                  parent: { ...node, parent },
                  req,
                  showHiddenFields,
                })
                return `<div class="lexical-table-container"><table class="lexical-table" style="border-collapse: collapse;">${childrenText}</table></div>`
              },
              nodeTypes: [TableNode.getType()],
            },
          },
          node: TableNode,
        }),
        createNode({
          converters: {
            html: {
              converter: async ({
                converters,
                currentDepth,
                depth,
                draft,
                node,
                overrideAccess,
                parent,
                req,
                showHiddenFields,
              }) => {
                const childrenText = await convertLexicalNodesToHTML({
                  converters,
                  currentDepth,
                  depth,
                  draft,
                  lexicalNodes: node.children,
                  overrideAccess,
                  parent: { ...node, parent },
                  req,
                  showHiddenFields,
                })
                const tagName = node.headerState > 0 ? 'th' : 'td'
                const headerStateClass = `lexical-table-cell-header-${node.headerState}`
                const backgroundColor = node.backgroundColor
                  ? `background-color: ${node.backgroundColor};`
                  : ''
                const colSpan =
                  node.colSpan && node.colSpan > 1 ? `colspan="${node.colSpan}"` : ''
                const rowSpan =
                  node.rowSpan && node.rowSpan > 1 ? `rowspan="${node.rowSpan}"` : ''
                return `<${tagName} class="lexical-table-cell ${headerStateClass}" style="border: 1px solid #ccc; padding: 8px; ${backgroundColor}" ${colSpan} ${rowSpan}>${childrenText}</${tagName}>`
              },
              nodeTypes: [TableCellNode.getType()],
            },
          },
          node: TableCellNode,
        }),
        createNode({
          converters: {
            html: {
              converter: async ({
                converters,
                currentDepth,
                depth,
                draft,
                node,
                overrideAccess,
                parent,
                req,
                showHiddenFields,
              }) => {
                const childrenText = await convertLexicalNodesToHTML({
                  converters,
                  currentDepth,
                  depth,
                  draft,
                  lexicalNodes: node.children,
                  overrideAccess,
                  parent: { ...node, parent },
                  req,
                  showHiddenFields,
                })
                return `<tr class="lexical-table-row">${childrenText}</tr>`
              },
              nodeTypes: [TableRowNode.getType()],
            },
          },
          node: TableRowNode,
        }),
      ],
    }
  },
  key: 'experimental_table',
})

/** Client-only: Czech-ify stock table chrome (labels hardcoded English in Payload). */
export const NazemiTableCsFeature = createServerFeature({
  feature: {
    ClientFeature: '/components/admin/lexical/NazemiTableCsFeature#NazemiTableCsFeatureClient',
  },
  key: 'nazemiTableCs',
})
