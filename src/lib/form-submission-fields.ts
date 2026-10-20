import type { Field } from 'payload'

/**
 * Friendlier form-submissions admin:
 * - UI summary table (Štítek → value) under Form, above raw rows
 * - row headers use Štítek; hide machine `field` input
 */
export function withFormSubmissionFields(defaultFields: Field[]): Field[] {
  const out: Field[] = []

  for (const field of defaultFields) {
    if ('name' in field && field.name === 'form') {
      out.push(field)
      out.push({
        name: 'submissionSummary',
        type: 'ui',
        admin: {
          components: {
            Field: '/components/admin/SubmissionSummaryField#SubmissionSummaryField',
          },
        },
      })
      continue
    }

    if ('name' in field && field.name === 'submissionData' && field.type === 'array') {
      out.push({
        ...field,
        labels: {
          singular: 'Údaj',
          plural: 'Odeslaná data',
        },
        fields: field.fields.map((inner): Field => {
          if ('name' in inner && inner.name === 'field' && inner.type === 'text') {
            return {
              ...inner,
              admin: {
                ...inner.admin,
                hidden: true,
                readOnly: true,
              },
            }
          }
          if ('name' in inner && inner.name === 'value') {
            return {
              ...inner,
              label: 'Hodnota',
              admin: {
                ...('admin' in inner ? inner.admin : {}),
                readOnly: true,
              },
            } as Field
          }
          return inner
        }),
        admin: {
          ...field.admin,
          initCollapsed: true,
          readOnly: true,
          components: {
            ...field.admin?.components,
            RowLabel:
              '/components/admin/SubmissionDataRowLabel#SubmissionDataRowLabel',
          },
        },
      })
      continue
    }

    out.push(field)
  }

  return out
}
