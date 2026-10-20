import type { Config, Plugin } from 'payload'

const FORM_SLUGS = new Set(['forms', 'form-submissions'])

/**
 * Form Builder appends its collections at the end of `config.collections`.
 * Sidebar group order = first occurrence of each `admin.group` — move forms
 * to sit right after Obsah webu (`prehledy`).
 */
export const reorderFormsNavPlugin: Plugin = (incoming) => {
  const collections = incoming.collections || []
  const forms = collections.filter((c) => FORM_SLUGS.has(c.slug))
  if (!forms.length) return incoming

  const rest = collections.filter((c) => !FORM_SLUGS.has(c.slug))
  const after = rest.findIndex((c) => c.slug === 'prehledy')
  const at = after >= 0 ? after + 1 : rest.length

  return {
    ...incoming,
    collections: [...rest.slice(0, at), ...forms, ...rest.slice(at)],
  } satisfies Config
}
