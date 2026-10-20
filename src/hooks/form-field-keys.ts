import type { CollectionBeforeChangeHook } from 'payload'

import { assignFormFieldKeys } from '@/lib/form-field-keys'

/** Auto `name` / option `value` from labels before save. */
export const assignFormFieldKeysBeforeChange: CollectionBeforeChangeHook = ({ data }) => {
  if (!data || typeof data !== 'object') return data
  return {
    ...data,
    fields: assignFormFieldKeys(data.fields),
  }
}
