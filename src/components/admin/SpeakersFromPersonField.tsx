'use client'

import { useEffect, useRef } from 'react'
import { RelationshipField, useField, useForm } from '@payloadcms/ui'
import type { RelationshipFieldClientComponent } from 'payload'

function idOf(value: unknown): null | number | string {
  if (value == null || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return (value as { id: number | string }).id
  }
  return null
}

function mediaIdOf(image: unknown): null | number | string {
  if (image == null || image === '') return null
  if (typeof image === 'number' || typeof image === 'string') return image
  if (typeof image === 'object' && image !== null && 'id' in image) {
    return (image as { id: number | string }).id
  }
  return null
}

/**
 * Relationship to `lide` — on user change, copy name / role / image into sibling
 * editable fields. Does not touch `quote` (Výrok). Skips initial hydrate so
 * existing edits are not overwritten when the doc loads.
 */
export const SpeakersFromPersonField: RelationshipFieldClientComponent = (props) => {
  const { path } = props
  const { value } = useField({ path })
  const { dispatchFields } = useForm()
  // undefined = not hydrated yet
  const prevId = useRef<null | number | string | undefined>(undefined)

  useEffect(() => {
    const id = idOf(value)

    if (prevId.current === undefined) {
      prevId.current = id
      return
    }
    if (prevId.current === id) return
    prevId.current = id
    if (id == null) return

    const rowPath = path.replace(/\.fromPerson$/, '')
    if (!rowPath || rowPath === path) return

    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`/api/lide/${id}?depth=0`, { credentials: 'include' })
        if (!res.ok || cancelled) return
        const person = (await res.json()) as {
          image?: unknown
          name?: string | null
          role?: string | null
        }
        if (cancelled) return

        dispatchFields({
          type: 'UPDATE',
          path: `${rowPath}.name`,
          value: typeof person.name === 'string' ? person.name : '',
        })
        dispatchFields({
          type: 'UPDATE',
          path: `${rowPath}.role`,
          value: typeof person.role === 'string' ? person.role : '',
        })
        dispatchFields({
          type: 'UPDATE',
          path: `${rowPath}.image`,
          value: mediaIdOf(person.image),
        })
      } catch {
        // Network fail — leave sibling fields as-is.
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [dispatchFields, path, value])

  return <RelationshipField {...props} />
}
