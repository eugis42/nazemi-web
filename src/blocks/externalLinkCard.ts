import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'
import { imageUploadFilter } from '@/fields/shared'

/** Absolute http(s) only — relative paths belong in vztahy / navigace. */
function validateExternalHttpUrl(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) return 'Zadejte URL webu.'
  try {
    const u = new URL(value.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return 'URL musí začínat https:// (nebo http://).'
    }
    return true
  } catch {
    return 'Neplatná URL.'
  }
}

/**
 * External site card — title / description / image stored on the block
 * (OG prefilled in admin, never re-fetched on public render).
 */
export const ExternalLinkCardBlock: Block = {
  slug: 'externalLinkCard',
  labels: {
    plural: 'Karty externího webu',
    singular: 'Karta externího webu',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'externalLinkCard',
    alt: 'Karta externího webu',
  }),
  fields: [
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      required: true,
      validate: validateExternalHttpUrl,
      admin: {
        components: {
          Field: '/components/admin/ExternalLinkCardUrlField#ExternalLinkCardUrlField',
        },
        description:
          'Absolutní odkaz (https://…). Tlačítko načte Open Graph do polí níže — lze pak upravit.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Nadpis',
      required: true,
      admin: {
        description: 'Předvyplní se z og:title — můžete přepsat.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
      admin: {
        description: 'Předvyplní se z og:description — můžete přepsat.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      label: 'Obrázek',
      relationTo: 'media',
      filterOptions: imageUploadFilter,
      admin: {
        description:
          'Předvyplní se z og:image (uloží se do Média). Můžete nahrát vlastní.',
      },
    },
    {
      name: 'buttonLabel',
      type: 'text',
      label: 'Text tlačítka',
      defaultValue: 'Otevřít',
      admin: {
        description: 'Výchozí „Otevřít“.',
      },
    },
  ],
}
