import { createServerFeature } from '@payloadcms/richtext-lexical'

import { lexicalEmbedBlockMenuItems } from '@/lib/lexical-embed-blocks'

/**
 * Payload puts Lexical blocks in a separate BlockIcon toolbar group.
 * The fixed-toolbar "+" (`add` group) only gets upload / relationship / HR.
 * Mirror the shared embed-blocks list into that "+" so it matches gutter/slash.
 */
export const BlocksInToolbarAddFeature = createServerFeature({
  feature: {
    ClientFeature:
      '/components/admin/lexical/BlocksInToolbarAddFeature#BlocksInToolbarAddFeatureClient',
    clientFeatureProps: {
      blocks: lexicalEmbedBlockMenuItems(),
    },
  },
  key: 'blocksInToolbarAdd',
})
