/**
 * Reset admin list-column preferences to each collection's defaultColumns.
 * Also strips stale URL-driven column prefs that override config.
 *
 * Usage: npx tsx scripts/reset-admin-column-prefs.ts
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@payload-config'

const LIST_SLUGS = [
  'sites',
  'stranky',
  'aktuality',
  'kalendar',
  'projekty',
  'workshopy',
  'publikace',
  'lide',
] as const

function columnsFromDefaults(names: string[] | undefined) {
  if (!names?.length) return undefined
  return names.map((accessor) => ({ accessor, active: true }))
}

async function main() {
  const payload = await getPayload({ config })

  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 50,
    pagination: false,
    where: {
      or: [
        { role: { equals: 'admin' } },
        { email: { equals: 'admin@nazemi.local' } },
      ],
    },
  })

  if (!users.docs.length) {
    console.error('No admin user found')
    process.exit(1)
  }

  const adminIds = new Set(users.docs.map((u) => u.id))
  console.log(
    'Admin users:',
    users.docs.map((u) => `${u.id} ${u.email}`).join(', '),
  )

  const prefs = await payload.find({
    collection: 'payload-preferences',
    depth: 0,
    limit: 500,
    pagination: false,
  })

  let deleted = 0
  for (const doc of prefs.docs) {
    const key = typeof doc.key === 'string' ? doc.key : ''
    if (!key.startsWith('collection-')) continue

    const userRef = doc.user
    let userId: number | string | null = null
    if (typeof userRef === 'number' || typeof userRef === 'string') {
      userId = userRef
    } else if (userRef && typeof userRef === 'object') {
      const rel = userRef as { id?: number | string; value?: number | string }
      userId = rel.value ?? rel.id ?? null
    }

    if (userId != null && !adminIds.has(userId as number)) continue

    console.log('delete', doc.id, key, 'user', userId)
    await payload.delete({
      collection: 'payload-preferences',
      id: doc.id,
    })
    deleted += 1
  }

  console.log(`Deleted ${deleted} collection list preference(s).`)

  // Seed fresh prefs from config so next visit without ?columns= uses new defaults.
  for (const admin of users.docs) {
    for (const slug of LIST_SLUGS) {
      const col = payload.collections[slug]?.config
      const columns = columnsFromDefaults(col?.admin?.defaultColumns)
      if (!columns) continue

      const sort =
        typeof col?.defaultSort === 'string'
          ? col.defaultSort
          : Array.isArray(col?.defaultSort)
            ? col.defaultSort[0]
            : undefined

      // user field beforeValidate reads req.user — must pass `user` on create
      const created = await payload.create({
        collection: 'payload-preferences',
        data: {
          key: `collection-${slug}`,
          value: {
            columns,
            ...(sort ? { sort } : {}),
          },
        },
        depth: 0,
        overrideAccess: true,
        user: admin,
      })
      console.log(
        'seed',
        created.id,
        `collection-${slug}`,
        'user',
        admin.id,
        'cols',
        columns.map((c) => c.accessor).join(','),
      )
    }
  }

  console.log('\nDone. Open list WITHOUT columns in URL, e.g.:')
  console.log('  http://localhost:3000/admin/collections/aktuality')
  console.log('If tab still has ?columns=... close it or strip that query param.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
