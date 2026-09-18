/**
 * Sentence-case Témata titles + merge duplicates (same folded title / aliases).
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-temata.ts --dry-run
 *   pnpm tsx scripts/cleanup-temata.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'
import { foldDiacritics } from '@/lib/diacritics'
import { slugify } from '@/lib/slug'

type TagDoc = {
  id: number | string
  slug: string
  title: string
}

type Payload = Awaited<ReturnType<typeof getPayload>>

const RELATION_FIELDS: Array<{
  collection: 'aktuality' | 'kalendar' | 'publikace' | 'workshopy'
  field: 'tags' | 'topics'
}> = [
  { collection: 'aktuality', field: 'tags' },
  { collection: 'kalendar', field: 'tags' },
  { collection: 'workshopy', field: 'topics' },
  { collection: 'publikace', field: 'topics' },
]

/**
 * Near-dupes that foldTitleKey misses (typos, abbreviations, sg/pl, stopwords).
 * Key = foldTitleKey(title|slug); value = shared group key + preferred title.
 */
const ALIASES: Record<string, { group: string; title: string }> = {
  'zhave netrendy': { group: 'zhave-netrendy', title: 'Žhavé a netrendy' },
  'zhave a netrendy': { group: 'zhave-netrendy', title: 'Žhavé a netrendy' },
  diskuse: { group: 'diskuze', title: 'Diskuze' },
  diskuze: { group: 'diskuze', title: 'Diskuze' },
  'eramus mobility': { group: 'erasmus-mobility', title: 'Erasmus+ mobility' },
  'erasmus mobility': { group: 'erasmus-mobility', title: 'Erasmus+ mobility' },
  ccc: { group: 'clean-clothes-campaign', title: 'Clean clothes campaign' },
  'clean clothes campaign': { group: 'clean-clothes-campaign', title: 'Clean clothes campaign' },
  kpn: { group: 'kdyz-prace-neslechti', title: 'Když práce nešlechtí' },
  'kdyz prace neslechti': { group: 'kdyz-prace-neslechti', title: 'Když práce nešlechtí' },
  seminar: { group: 'seminar', title: 'Seminář' },
  seminare: { group: 'seminar', title: 'Seminář' },
  vystava: { group: 'vystava', title: 'Výstava' },
  vystavy: { group: 'vystava', title: 'Výstava' },
}

/** Czech sentence case: capitalize first letter; leave rest as-is (keep acronyms). */
export const sentenceCaseCs = (value: string) => {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return trimmed
  const match = /^([^a-zA-Zá-žÁ-Ž]*)(.*)$/u.exec(trimmed)
  if (!match) return trimmed
  const [, prefix, rest] = match
  if (!rest) return trimmed
  const first = rest.charAt(0).toLocaleUpperCase('cs')
  return `${prefix}${first}${rest.slice(1)}`
}

export const foldTitleKey = (title: string) =>
  foldDiacritics(title)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const resolveGroup = (tag: TagDoc) => {
  const folded = foldTitleKey(tag.title) || foldTitleKey(tag.slug)
  const alias = ALIASES[folded]
  if (alias) return { key: alias.group, preferredTitle: alias.title }
  return { key: folded || String(tag.id), preferredTitle: null as string | null }
}

const argDryRun = process.argv.includes('--dry-run')

async function retargetTag(
  payload: Payload,
  dup: TagDoc,
  keep: TagDoc,
): Promise<number> {
  let updated = 0
  for (const { collection, field } of RELATION_FIELDS) {
    const docs = await payload.find({
      collection,
      depth: 0,
      limit: 500,
      overrideAccess: true,
      pagination: false,
      where: { [field]: { equals: dup.id } },
    })
    for (const doc of docs.docs) {
      const current = (doc as Record<string, unknown>)[field]
      const ids = (Array.isArray(current) ? current : [])
        .map((item) =>
          item && typeof item === 'object' && 'id' in item
            ? (item as { id: number | string }).id
            : item,
        )
        .filter(Boolean) as Array<number | string>
      const next = [...new Set(ids.map((id) => (String(id) === String(dup.id) ? keep.id : id)))]
      await payload.update({
        id: doc.id,
        collection,
        data: { [field]: next } as never,
        depth: 0,
        overrideAccess: true,
      })
      updated += 1
    }
  }
  await payload.delete({
    collection: 'tags',
    id: dup.id,
    overrideAccess: true,
  })
  return updated
}

async function main() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'tags',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    sort: 'title',
  })
  const tags = result.docs as TagDoc[]
  console.log(`Tags: ${tags.length}${argDryRun ? ' (dry-run)' : ''}`)

  const groups = new Map<string, { preferredTitle: string | null; tags: TagDoc[] }>()
  for (const tag of tags) {
    const { key, preferredTitle } = resolveGroup(tag)
    const entry = groups.get(key) || { preferredTitle: null, tags: [] }
    entry.tags.push(tag)
    if (preferredTitle) entry.preferredTitle = preferredTitle
    groups.set(key, entry)
  }

  let renamed = 0
  let merged = 0
  let deleted = 0

  for (const [, entry] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const group = entry.tags
    const richest = [...group].sort((a, b) => b.title.length - a.title.length)[0]
    const title = sentenceCaseCs(entry.preferredTitle || richest.title)
    const desiredSlug = slugify(title)
    const keep =
      group.find((t) => t.slug === desiredSlug) ||
      group.find((t) => t.title === title) ||
      [...group].sort((a, b) => Number(a.id) - Number(b.id))[0]
    const drop = group.filter((t) => String(t.id) !== String(keep.id))

    const needsRename = keep.title !== title || keep.slug !== desiredSlug
    if (drop.length || needsRename) {
      console.log(
        `• "${group.map((t) => t.title).join('" | "')}" → "${title}"` +
          (drop.length ? ` (merge ${drop.length} → keep ${keep.id})` : ''),
      )
    }

    if (argDryRun) continue

    for (const dup of drop) {
      merged += await retargetTag(payload, dup, keep)
      deleted += 1
    }

    if (needsRename) {
      const slugClash = await payload.find({
        collection: 'tags',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: {
          and: [{ slug: { equals: desiredSlug } }, { id: { not_equals: keep.id } }],
        },
      })
      await payload.update({
        id: keep.id,
        collection: 'tags',
        data: {
          title,
          slug: slugClash.docs[0] ? keep.slug : desiredSlug,
        } as never,
        depth: 0,
        overrideAccess: true,
      })
      renamed += 1
    }
  }

  if (argDryRun) {
    const dupGroups = [...groups.values()].filter((g) => g.tags.length > 1)
    const caseOnly = tags.filter((t) => t.title !== sentenceCaseCs(t.title))
    console.log({
      duplicateGroups: dupGroups.length,
      tagsNeedingCase: caseOnly.length,
      totalGroups: groups.size,
    })
    process.exit(0)
  }

  console.log({ deleted, mergedDocs: merged, renamed })
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
