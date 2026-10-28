'use client'

import { createClientFeature } from '@payloadcms/richtext-lexical/client'

import { NazemiTableUiCsPlugin } from '@/components/admin/lexical/NazemiTableUiCs'

export const NazemiTableCsFeatureClient = createClientFeature({
  plugins: [{ Component: NazemiTableUiCsPlugin, position: 'normal' }],
})
