/** Minimal Form Builder shapes used on the frontend (avoids circular payload-types deps). */

export type FormFieldOption = { label: string; value: string }

export type FormFieldBlock = {
  blockType: string
  defaultValue?: boolean | number | string | null
  /** Admin „Popis“ — shown under the label on the frontend. */
  description?: string | null
  id?: string
  label?: string | null
  message?: unknown
  name?: string
  options?: FormFieldOption[] | null
  placeholder?: string | null
  required?: boolean | null
  width?: number | null
}

export type FormDoc = {
  confirmationMessage?: unknown
  confirmationType?: 'message' | 'redirect' | null
  fields?: FormFieldBlock[] | null
  id: number | string
  redirect?: {
    reference?:
      | { relationTo?: string; value?: { slug?: string | null } | number | string | null }
      | null
    type?: 'custom' | 'reference' | null
    url?: string | null
  } | null
  submitButtonLabel?: string | null
  title?: string | null
}

export type FormEmbedFields = {
  buttonLabel?: string | null
  description?: string | null
  form?: unknown
  title?: string | null
  [key: string]: unknown
}
