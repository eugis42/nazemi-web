/**
 * Convert 3 sloupce / 3 karty column `body` from plain text → Lexical jsonb.
 *
 * Safe on prod: only touches `body` on `*_blocks_three_{columns,cards}_columns`
 * (and version tables). Skips rows already Lexical-shaped. Leaves media alone.
 *
 * Preferred deploy order:
 *   1. Deploy this commit
 *   2. npx tsx scripts/migrate-three-block-bodies.ts   # varchar → Lexical jsonb
 *   3. npm run db:push                                 # align schema (usually no-op after step 2)
 *
 * Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/migrate-three-block-bodies.ts
 *        npx tsx scripts/migrate-three-block-bodies.ts --dry-run
 */
import 'dotenv/config'
import pg from 'pg'

type LexicalValue = Record<string, unknown>

const dryRun = process.argv.includes('--dry-run')

/** Minimal Lexical paragraph(s) from plain text (newlines → paragraphs). */
export function plainTextToLexical(text: string): LexicalValue {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const lines = paragraphs.length ? paragraphs : [text.trim()].filter(Boolean)

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: lines.map((line) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: line,
            version: 1,
          },
        ],
      })),
    },
  }
}

function isLexicalRoot(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const root = (value as { root?: unknown }).root
  return Boolean(root && typeof root === 'object' && !Array.isArray(root))
}

/** Extract plain string from a body cell (varchar, jsonb string, or already Lexical). */
function asPlainText(body: unknown): string | null {
  if (body == null) return null
  if (typeof body === 'string') {
    const trimmed = body.trim()
    if (!trimmed) return null
    // Already stringified Lexical?
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (isLexicalRoot(parsed)) return null
      } catch {
        // plain text that happens to start with {
      }
    }
    return trimmed
  }
  if (typeof body === 'object') {
    if (isLexicalRoot(body)) return null
    // jsonb string stored as object? unlikely
  }
  return null
}

async function listBodyTables(client: pg.Client): Promise<string[]> {
  const result = await client.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND (
         table_name LIKE '%\\_blocks\\_three\\_columns\\_columns' ESCAPE '\\'
         OR table_name LIKE '%\\_blocks\\_three\\_cards\\_columns' ESCAPE '\\'
       )
     ORDER BY table_name`,
  )
  return result.rows.map((r) => r.table_name)
}

async function bodyColumnType(
  client: pg.Client,
  table: string,
): Promise<'varchar' | 'text' | 'jsonb' | 'other' | 'missing'> {
  const result = await client.query<{ udt_name: string }>(
    `SELECT udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'body'`,
    [table],
  )
  const udt = result.rows[0]?.udt_name
  if (!udt) return 'missing'
  if (udt === 'varchar' || udt === 'text') return udt
  if (udt === 'jsonb') return 'jsonb'
  return 'other'
}

async function migrateTable(client: pg.Client, table: string): Promise<number> {
  const colType = await bodyColumnType(client, table)
  if (colType === 'missing') {
    console.log(`skip ${table}: no body column`)
    return 0
  }

  const rows = await client.query<{ id: string; body: unknown }>(
    `SELECT id, body FROM "${table}" WHERE body IS NOT NULL`,
  )

  let updated = 0
  for (const row of rows.rows) {
    const plain = asPlainText(row.body)
    if (plain == null) continue

    const lexical = plainTextToLexical(plain)
    if (dryRun) {
      console.log(`[dry-run] ${table} id=${row.id} ← ${plain.slice(0, 60)}…`)
      updated += 1
      continue
    }

    if (colType === 'jsonb') {
      await client.query(`UPDATE "${table}" SET body = $1::jsonb WHERE id = $2`, [
        JSON.stringify(lexical),
        row.id,
      ])
    } else {
      // Keep as JSON text until we ALTER the column below.
      await client.query(`UPDATE "${table}" SET body = $1 WHERE id = $2`, [
        JSON.stringify(lexical),
        row.id,
      ])
    }
    updated += 1
  }

  if (!dryRun && (colType === 'varchar' || colType === 'text')) {
    // After conversion, non-null bodies are JSON text (or null) → cast to jsonb.
    await client.query(
      `ALTER TABLE "${table}"
       ALTER COLUMN body TYPE jsonb
       USING CASE
         WHEN body IS NULL OR btrim(body::text) = '' THEN NULL
         ELSE body::jsonb
       END`,
    )
    console.log(`${table}: altered body ${colType} → jsonb`)
  }

  return updated
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    const tables = await listBodyTables(client)
    if (!tables.length) {
      console.log('No threeColumns/threeCards column tables found.')
      return
    }

    let total = 0
    for (const table of tables) {
      const n = await migrateTable(client, table)
      if (n > 0) console.log(`${table}: converted ${n} body value(s)`)
      else console.log(`${table}: nothing to convert`)
      total += n
    }
    console.log(
      dryRun
        ? `Dry run done — would convert ${total} body value(s)`
        : `Done — converted ${total} body value(s)`,
    )
  } finally {
    await client.end()
  }
}

// Self-check (ponytail): plain → Lexical round-trip shape.
if (process.argv.includes('--self-check')) {
  const sample = plainTextToLexical('Ahoj\n\ndruhý odstavec')
  const kids = (sample.root as { children: unknown[] }).children
  if (kids.length !== 2) throw new Error(`expected 2 paragraphs, got ${kids.length}`)
  const text = (
    (kids[0] as { children: { text: string }[] }).children[0] as { text: string }
  ).text
  if (text !== 'Ahoj') throw new Error(`unexpected text: ${text}`)
  console.log('self-check ok')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
