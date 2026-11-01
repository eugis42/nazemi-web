import type { BeforeEmail } from '@payloadcms/plugin-form-builder/types'
import type { Field } from 'payload'

import { formFieldLabelMap } from '@/lib/form-field-labels'
import { richTextParagraphs } from '@/seed/html'

export { formFieldLabelMap } from '@/lib/form-field-labels'

/** Tokens editors can put in email subject / body (resolved at send). */
export const FORM_EMAIL_SITE_TOKEN = '{{siteName}}'
export const FORM_EMAIL_TITLE_TOKEN = '{{formTitle}}'

/** Default subject — variables resolved in `nazemiFormBeforeEmail`. */
export const DEFAULT_FORM_EMAIL_SUBJECT = `${FORM_EMAIL_SITE_TOKEN}: Vyplněný formulář ${FORM_EMAIL_TITLE_TOKEN}`

function formTitle(data: Record<string, unknown> | undefined): string {
  const title = data?.title
  return typeof title === 'string' && title.trim() ? title.trim() : 'formuláře'
}

async function siteName(
  data: Record<string, unknown> | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BeforeEmail req; avoid PayloadRequest coupling
  req: any,
): Promise<string> {
  const siteRef = data?.site
  if (siteRef == null || !req?.payload) return 'NaZemi'
  const id =
    typeof siteRef === 'object' && siteRef !== null && 'id' in siteRef
      ? (siteRef as { id: unknown }).id
      : siteRef
  if (typeof id !== 'number' && typeof id !== 'string') return 'NaZemi'
  try {
    const site = await req.payload.findByID({
      collection: 'sites',
      id,
      depth: 0,
      overrideAccess: true,
    })
    const name = site?.name
    return typeof name === 'string' && name.trim() ? name.trim() : 'NaZemi'
  } catch {
    return 'NaZemi'
  }
}

/** Subject default when adding a new notification email row. */
export function defaultFormEmailSubject(): string {
  return DEFAULT_FORM_EMAIL_SUBJECT
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

/**
 * Resolve subject tokens for the final outbound email.
 * Payload `replaceDoubleCurlys` runs *before* `beforeEmail` and turns unknown
 * `{{siteName}}` / `{{formTitle}}` into bare `siteName` / `formTitle` — handle both.
 */
export function applySubjectTokens(subject: string, site: string, title: string): string {
  return subject
    .split(FORM_EMAIL_SITE_TOKEN)
    .join(site)
    .split(FORM_EMAIL_TITLE_TOKEN)
    .join(title)
    .split('siteName')
    .join(site)
    .split('formTitle')
    .join(title)
}

/** beforeEmail — site/form tokens + rewrite wildcard table keys to human labels. */
export const nazemiFormBeforeEmail: BeforeEmail = async (emails, { data, req }) => {
  const formRef = data?.form
  const formId =
    formRef && typeof formRef === 'object' && formRef !== null && 'id' in formRef
      ? (formRef as { id: unknown }).id
      : formRef

  let labels: Record<string, string> = { formSubmissionID: 'ID odpovědi' }
  let formDoc: Record<string, unknown> | null = null
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
      formDoc =
        form && typeof form === 'object' ? (form as unknown as Record<string, unknown>) : null
      labels = formFieldLabelMap(
        formDoc && 'fields' in formDoc ? formDoc.fields : null,
      )
    } catch {
      // keep fallback map
    }
  }

  const title = formTitle(formDoc || undefined)
  const site = await siteName(formDoc || undefined, req)

  return emails.map((email) => ({
    ...email,
    subject:
      typeof email.subject === 'string'
        ? applySubjectTokens(email.subject, site, title)
        : email.subject,
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
          admin: {
            ...inner.admin,
            description:
              'Proměnné: {{siteName}} = název webu, {{formTitle}} = název formuláře. Pole formuláře: {{nazevPole}}.',
          },
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
