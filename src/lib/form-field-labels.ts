type FormFieldLike = {
  blockType?: string | null
  label?: string | null
  name?: string | null
}

/** name → Štítek (plus plugin’s formSubmissionID). */
export function formFieldLabelMap(fields: unknown): Record<string, string> {
  const map: Record<string, string> = {
    formSubmissionID: 'ID odpovědi',
  }
  if (!Array.isArray(fields)) return map
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue
    const field = raw as FormFieldLike
    if (field.blockType === 'message') continue
    const name = typeof field.name === 'string' ? field.name.trim() : ''
    if (!name) continue
    const label =
      (typeof field.label === 'string' && field.label.trim()) || name
    map[name] = label
  }
  return map
}
