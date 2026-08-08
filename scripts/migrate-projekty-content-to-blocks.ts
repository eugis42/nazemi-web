/**
 * Backup projekty.content (richText jsonb) → migrate to blocks after schema push.
 *
 * 1. npx tsx scripts/migrate-projekty-content-to-blocks.ts backup
 * 2. npm run db:push
 * 3. npx tsx scripts/migrate-projekty-content-to-blocks.ts restore
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { getPayload } from 'payload'
import config from '@payload-config'

const BACKUP = path.resolve('scripts/.projekty-content-backup.json')

type BackupRow = { id: number; slug: string; content: unknown; versionContents: unknown[] }

async function backup() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  try {
    const rows = await c.query<{ id: number; slug: string; content: unknown }>(
      `SELECT id, slug, content FROM projekty WHERE content IS NOT NULL`,
    )
    const out: BackupRow[] = []
    for (const row of rows.rows) {
      // Skip if already array (blocks) — nothing to backup as richText
      if (Array.isArray(row.content)) {
        console.log(`skip ${row.slug}: already blocks-shaped`)
        continue
      }
      const versions = await c.query<{ version_content: unknown }>(
        `SELECT version_content FROM _projekty_v WHERE parent_id = $1 AND version_content IS NOT NULL`,
        [row.id],
      )
      out.push({
        id: row.id,
        slug: row.slug,
        content: row.content,
        versionContents: versions.rows
          .map((v) => v.version_content)
          .filter((v) => v && !Array.isArray(v)),
      })
    }
    writeFileSync(BACKUP, JSON.stringify(out, null, 2))
    console.log(`Backed up ${out.length} projekty → ${BACKUP}`)
  } finally {
    await c.end()
  }
}

async function restore() {
  const raw = readFileSync(BACKUP, 'utf8')
  const rows = JSON.parse(raw) as BackupRow[]
  const payload = await getPayload({ config })

  for (const row of rows) {
    if (!row.content || Array.isArray(row.content)) continue
    await payload.update({
      collection: 'projekty',
      id: row.id,
      data: {
        content: [
          {
            blockType: 'richText',
            content: row.content as never,
          },
        ],
        _status: 'published',
      },
      draft: false,
      overrideAccess: true,
    })
    console.log(`restored ${row.slug} (id=${row.id})`)
  }

  await payload.db.destroy?.()
  console.log(`Restored ${rows.length} projekty as richText blocks`)
}

const mode = process.argv[2]
if (mode === 'backup') {
  backup().catch((e) => {
    console.error(e)
    process.exit(1)
  })
} else if (mode === 'restore') {
  restore().catch((e) => {
    console.error(e)
    process.exit(1)
  })
} else {
  console.error('Usage: npx tsx scripts/migrate-projekty-content-to-blocks.ts backup|restore')
  process.exit(1)
}
