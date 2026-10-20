import type { BeforeEmail } from '@payloadcms/plugin-form-builder/types'
import type { Field } from 'payload'

import { formFieldLabelMap } from '@/lib/form-field-labels'
import { richTextParagraphs } from '@/seed/html'

export { formFieldLabelMap } from '@/lib/form-field-labels'

function formTitle(data: Record<string, unknown> | undefined): string {
  const title = data?.title
  return typeof title === 'string' && title.trim() ? title.trim() : 'formuláře'
}

async function siteName(
  data: Record<string, unknown> | undefined,
  req: { payload?: { findByID: (args: unknown) => Promise<{ name?: string | null } | null> } } | undefined,
): Promise<string> {
  const siteRef = data?.site
  if (siteRef == null || !req?.payload) return 'webu'
  const id =
    typeof siteRef === 'object' && siteRef !== null && 'id' in siteRef
      ? (siteRef as { id: unknown }).id
      : siteRef
  if (typeof id !== 'number' && typeof id !== 'string') return 'webu'
  try {
    const site = await req.payload.findByID({
      collection: 'sites',
      id,
      depth: 0,
      overrideAccess: true,
    })
    const name = site?.name
    return typeof name === 'string' && name.trim() ? name.trim() : 'webu'
  } catch {
    return 'webu'
  }
}

/** Subject for a newly added form notification email. */
export async function defaultFormEmailSubject({
  data,
  req,
}: {
  data?: Record<string, unknown>
  req?: Parameters<typeof siteName>[1]
}): Promise<string> {
  const title = formTitle(data)
  const site = await siteName(data, req)
  return `Nová zpráva z formuláře ${title} na webu ${site}`
}

/** Lexical body — HTML table of all answers (`{{*:table}}`). */
export function defaultFormEmailMessage(): ReturnType<typeof richTextParagraphs> {
  return richTextParagraphs([
    'Dobrý den,',
    'na webu byla odeslána nová zpráva z formuláře.',
    '{{*:table}}',
    '—',
    'Tato zpráva byla odeslána automaticky z webu NaZemi.',
  ])
}

const DEFAULT_EMAIL_FROM = 'web@nazemi.cz'

/**
 * `{{*:table}}` / `{{*}}` use machine `name` as the left column.
 * Swap those keys for Štítek labels in the already-serialized HTML.
 */
export function remapEmailHtmlFieldKeys(
  html: string,
  labels: Record<string, string>,
): string {
  let out = html
  // Longer keys first so `e_mail` does not partially clash with shorter names.
  const keys = Object.keys(labels).sort((a, b) => b.length - a.length)
  for (const name of keys) {
    const label = labels[name]
    if (!label || label === name) continue
    out = out.split(`<td>${name}</td>`).join(`<td>${label}</td>`)
    out = out.split(`${name} : `).join(`${label} : `)
  }
  return out
}

/** beforeEmail — rewrite wildcard table/list keys to human labels. */
export const nazemiFormBeforeEmail: BeforeEmail = async (emails, { data, req }) => {
  const formRef = data?.form
  const formId =
    formRef && typeof formRef === 'object' && formRef !== null && 'id' in formRef
      ? (formRef as { id: unknown }).id
      : formRef

  let labels: Record<string, string> = { formSubmissionID: 'ID odpovědi' }
  if (
    (typeof formId === 'number' || typeof formId === 'string') &&
    req?.payload
  ) {
    try {
      const form = await req.payload.findByID({
        collection: 'forms',
        id: formId,
        depth: 0,
        overrideAccess: true,
      })
      labels = formFieldLabelMap(
        form && typeof form === 'object' && 'fields' in form
          ? (form as { fields?: unknown }).fields
          : null,
      )
    } catch {
      // keep fallback map
    }
  }

  return emails.map((email) => ({
    ...email,
    html: typeof email.html === 'string'
      ? remapEmailHtmlFieldKeys(email.html, labels)
      : email.html,
  }))
}

/** Patch Forms `emails` array defaults (from / subject / body). */
export function withFormEmailDefaults(field: Field): Field {
  if (field.type !== 'array' || !('name' in field) || field.name !== 'emails') {
    return field
  }
  if (!Array.isArray(field.fields)) return field

  return {
    ...field,
    fields: field.fields.map((inner) => {
      if (inner.type === 'row' && Array.isArray(inner.fields)) {
        return {
          ...inner,
          fields: inner.fields.map((rowField) => {
            if ('name' in rowField && rowField.name === 'emailFrom' && rowField.type === 'text') {
              return {
                ...rowField,
                defaultValue: DEFAULT_EMAIL_FROM,
              }
            }
            return rowField
          }),
        }
      }

      if ('name' in inner && inner.name === 'subject' && inner.type === 'text') {
        return {
          ...inner,
          defaultValue: defaultFormEmailSubject,
        }
      }

      if ('name' in inner && inner.name === 'message' && inner.type === 'richText') {
        return {
          ...inner,
          defaultValue: defaultFormEmailMessage,
        }
      }

      return inner
    }),
  }
}
