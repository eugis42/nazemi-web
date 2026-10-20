'use client'

import { useDocumentInfo } from '@payloadcms/ui'

import { useSubmissionFieldLabels } from '@/lib/form-labels-client'

type SubmissionRow = {
  field?: string | null
  value?: string | null
  id?: string | null
}

type DocWithRows = {
  submissionData?: SubmissionRow[] | null
}

/**
 * Read-only Štítek → value table (email-like).
 * Must read rows from document data — array `useField` is not `[{field,value}]`.
 */
export function SubmissionSummaryField() {
  const { initialData, savedDocumentData } = useDocumentInfo()
  const labels = useSubmissionFieldLabels()

  const doc = (savedDocumentData ?? initialData) as DocWithRows | undefined
  const list = Array.isArray(doc?.submissionData) ? doc.submissionData : []

  if (!list.length) {
    return (
      <p style={{ margin: '0 0 1rem', opacity: 0.7 }}>Žádná odeslaná data.</p>
    )
  }

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <p
        style={{
          margin: '0 0 0.75rem',
          fontWeight: 600,
        }}
      >
        Přehled odpovědi
      </p>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <tbody>
          {list.map((row, index) => {
            const key =
              typeof row.field === 'string' && row.field.trim()
                ? row.field.trim()
                : `row-${index}`
            const label = labels[key] || key
            const value =
              typeof row.value === 'string' ? row.value : String(row.value ?? '')
            return (
              <tr key={row.id || `${key}-${index}`}>
                <td
                  style={{
                    padding: '0.45rem 1rem 0.45rem 0',
                    verticalAlign: 'top',
                    fontWeight: 600,
                    width: '35%',
                    borderBottom: '1px solid var(--theme-elevation-150)',
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: '0.45rem 0',
                    verticalAlign: 'top',
                    whiteSpace: 'pre-wrap',
                    borderBottom: '1px solid var(--theme-elevation-150)',
                  }}
                >
                  {value}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
