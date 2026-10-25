import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'
import { validateIframeEmbedSource } from '@/lib/iframe-embed'

/**
 * Secure embed — stores paste/URL, FE renders only a sandboxed https iframe.
 * Never persists or executes arbitrary HTML/JS on the page origin.
 */
export const IframeEmbedBlock: Block = {
  slug: 'iframeEmbed',
  labels: {
    plural: 'Vlastní kódy',
    singular: 'Vlastní kód',
  },
  admin: blockPickerAdmin({
    group: BLOCK_GROUP_PAGE,
    thumb: 'iframeEmbed',
    alt: 'Vlastní kód',
  }),
  fields: [
    {
      name: 'source',
      type: 'textarea',
      label: 'URL nebo kód iframe',
      required: true,
      validate: validateIframeEmbedSource,
      admin: {
        description:
          'Vložte https URL, nebo celý &lt;iframe&gt; z YouTube / Map / formuláře. Uloží se jen bezpečný src — skripty a jiný HTML se nevykreslí.',
        rows: 4,
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Titulek (přístupnost)',
      defaultValue: 'Vložený obsah',
      admin: {
        description: 'Popis obsahu pro čtečky obrazovky (atribut title u iframe).',
      },
    },
    {
      name: 'aspect',
      type: 'select',
      label: 'Poměr stran',
      defaultValue: '16/9',
      options: [
        { label: '16∶9 (video)', value: '16/9' },
        { label: '4∶3', value: '4/3' },
        { label: '1∶1', value: '1/1' },
        { label: '21∶9', value: '21/9' },
      ],
      admin: {
        description: 'Výška se počítá z šířky obsahu.',
      },
    },
  ],
}
