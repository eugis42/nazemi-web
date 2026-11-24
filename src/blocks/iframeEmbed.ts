import type { Block } from 'payload'

import { BLOCK_GROUP_PAGE, blockPickerAdmin } from '@/blocks/blockMeta'
import { validateIframeEmbedSource } from '@/lib/iframe-embed'

/**
 * Secure embed — stores paste/URL; FE mounts sandboxed iframe or allowlisted script.
 * Never persists or executes arbitrary HTML / inline JS on the page origin.
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
      label: 'URL nebo kód',
      required: true,
      validate: validateIframeEmbedSource,
      admin: {
        description:
          'https URL, &lt;iframe&gt;, nebo &lt;script src&gt; z dovoleného hostitele (např. widget.proca.app). Uloží se jen bezpečný src. Inline skripty a jiné HTML se nevykreslí.',
        rows: 4,
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Titulek (přístupnost)',
      defaultValue: 'Vložený obsah',
      admin: {
        description: 'Popis obsahu pro čtečky obrazovky.',
      },
    },
  ],
}
