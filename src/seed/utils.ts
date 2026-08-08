import path from 'path'
import { fileURLToPath } from 'url'

import type { CollectionSlug, Payload, Where } from 'payload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const rootDir = path.resolve(dirname, '../..')
export const seedAssetsDir = path.join(rootDir, 'public/seed')

export type SeedPayload = Payload

/** Create or update a document matched by a single field (scoped by site when available). */
export const upsertByField = async <TSlug extends CollectionSlug>({
  collection,
  data,
  field,
  payload,
}: {
  collection: TSlug
  data: Record<string, unknown>
  field: string
  payload: SeedPayload
}) => {
  const value = data[field]
  const where: Where =
    field === 'slug' && data.site
      ? {
          and: [{ slug: { equals: value } }, { site: { equals: data.site } }],
        }
      : {
          [field]: { equals: value },
        }

  const existing = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where,
  })

  if (existing.docs[0]) {
    return payload.update({
      id: existing.docs[0].id,
      collection,
      data: data as never,
      overrideAccess: true,
    })
  }

  return payload.create({
    collection,
    data: data as never,
    overrideAccess: true,
  })
}

/**
 * Upload an asset from `public/seed/`. `file` may be nested, e.g. `team/klara.berg.jpg`.
 * Replaces an existing doc when the on-disk seed file differs in size (stale placeholders).
 */
export const upsertMedia = async ({
  alt,
  caption,
  file,
  payload,
}: {
  alt: string
  caption?: string
  file: string
  payload: SeedPayload
}) => {
  const fileName = path.basename(file)
  const filePath = path.join(seedAssetsDir, file)
  const { statSync } = await import('node:fs')
  const seedSize = statSync(filePath).size

  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      or: [{ alt: { equals: alt } }, { filename: { equals: fileName } }],
    },
  })

  const doc = existing.docs[0]
  if (doc) {
    const storedSize = typeof doc.filesize === 'number' ? doc.filesize : 0
    if (storedSize === seedSize) {
      return doc
    }
    await payload.delete({
      collection: 'media',
      id: doc.id,
      overrideAccess: true,
    })
  }

  return payload.create({
    collection: 'media',
    data: {
      alt,
      ...(caption ? { caption } : {}),
    },
    filePath,
    overrideAccess: true,
  })
}

/** Cache media uploads by seed-relative path so each asset is uploaded once. */
export const createMediaLoader = (payload: SeedPayload) => {
  const cache = new Map<string, Promise<{ id: number | string }>>()

  return async (file: string, alt: string) => {
    const cached = cache.get(file)
    if (cached) return cached

    const promise = upsertMedia({ alt, file, payload }).then((doc) => ({ id: doc.id }))
    cache.set(file, promise)
    return promise
  }
}

const CZECH_DATE = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/

/**
 * Parse design dates (`16. 6. 2026`) plus optional time range (`9:00 – 17:00`).
 * Times are treated as local Europe/Prague wall clock, stored as ISO.
 */
export const parseCzechDate = (date: string, time?: string) => {
  const match = CZECH_DATE.exec(date.trim())
  if (!match) {
    throw new Error(`Nepodařilo se rozparsovat datum: "${date}"`)
  }

  const [, day, month, year] = match
  const [startTime, endTime] = parseTimeRange(time)

  return {
    endDate: endTime
      ? isoFromParts(Number(year), Number(month), Number(day), endTime)
      : null,
    startDate: isoFromParts(Number(year), Number(month), Number(day), startTime),
  }
}

const parseTimeRange = (time?: string): [{ hours: number; minutes: number }, { hours: number; minutes: number } | null] => {
  const fallback = { hours: 9, minutes: 0 }
  if (!time) return [fallback, null]

  const parts = time
    .split(/[–—-]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseTime)
    .filter((part): part is { hours: number; minutes: number } => Boolean(part))

  if (!parts.length) return [fallback, null]
  return [parts[0], parts[1] ?? null]
}

const parseTime = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  return { hours: Number(match[1]), minutes: Number(match[2]) }
}

/** Europe/Prague is UTC+1 (winter) or UTC+2 (summer); derive the offset for the given day. */
const isoFromParts = (
  year: number,
  month: number,
  day: number,
  { hours, minutes }: { hours: number; minutes: number },
) => {
  const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes)
  const offsetMinutes = pragueOffsetMinutes(new Date(naiveUtc))
  return new Date(naiveUtc - offsetMinutes * 60_000).toISOString()
}

const pragueOffsetMinutes = (reference: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Prague',
    timeZoneName: 'longOffset',
  })
  const part = formatter.formatToParts(reference).find((item) => item.type === 'timeZoneName')
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(part?.value ?? '')
  if (!match) return 60
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

/** Czech-aware slugify for taxonomy terms coming from design labels. */
export const slugifyCs = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
