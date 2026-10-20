import { describe, expect, it } from 'vitest'

import { withFormSubmissionFields } from '@/lib/form-submission-fields'

describe('withFormSubmissionFields', () => {
  it('adds summary UI after form + RowLabel + hides field key', () => {
    const fields = withFormSubmissionFields([
      { name: 'form', type: 'relationship', relationTo: 'forms', required: true },
      {
        name: 'submissionData',
        type: 'array',
        fields: [
          { name: 'field', type: 'text', required: true },
          { name: 'value', type: 'textarea', required: true },
        ],
      },
    ])

    expect(fields.map((f) => ('name' in f ? f.name : null))).toEqual([
      'form',
      'submissionSummary',
      'submissionData',
    ])
    expect(fields[1]).toMatchObject({ name: 'submissionSummary', type: 'ui' })

    const data = fields.find((f) => 'name' in f && f.name === 'submissionData')
    expect(data?.type).toBe('array')
    if (data?.type !== 'array') return
    expect(data.labels?.singular).toBe('Údaj')
    expect(data.admin?.initCollapsed).toBe(true)
    expect(data.admin?.components?.RowLabel).toContain('SubmissionDataRowLabel')

    const keyField = data.fields.find((f) => 'name' in f && f.name === 'field')
    expect(
      keyField &&
        'admin' in keyField &&
        keyField.admin &&
        'hidden' in keyField.admin &&
        keyField.admin.hidden,
    ).toBe(true)
  })
})
