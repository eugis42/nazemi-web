import { createServerFeature } from '@payloadcms/richtext-lexical'

/**
 * Injects document-site colour CSS vars into the admin shell so TextStateFeature
 * swatches resolve against the content’s site (saved/loaded), not the admin cookie.
 */
export const SiteTextColorVarsFeature = createServerFeature({
  feature: {
    ClientFeature: '/components/admin/lexical/SiteTextColorVarsFeature#SiteTextColorVarsFeatureClient',
  },
  key: 'siteTextColorVars',
})
