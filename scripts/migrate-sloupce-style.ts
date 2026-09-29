/**
 * Sloupce: `borders` boolean → `style` select (clean | bordered | table).
 *
 * - borders false / null → clean
 * - borders true → bordered
 * - table is new (no legacy rows)
 *
 * Order:
 *   1. npx tsx scripts/migrate-sloupce-style.ts --dry-run
 *   2. npx tsx scripts/migrate-sloupce-style.ts
 *   3. npm run db:push   # drop borders; ensure style enum matches schema
 *
 * Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/migrate-sloupce-style.ts
 *        npx tsx scripts/migrate-sloupce-style.ts --dry-run
 *        npx tsx scripts/migrate-sloupce-style.ts --self-check
 */
import 'dotenv/config'
import pg from 'pg'

const dryRun = process.argv.includes('--dry-run')

const COLLECTIONS = ['stranky', 'workshopy', 'projekty'] as const

const STYLE_VALUES = ['clean', 'bordered', 'table'] as const

function tablesFor(collection: (typeof COLLECTIONS)[number]): string[] {
  return [
    `${collection}_blocks_three_columns`,
    `_${collection}_v_blocks_three_columns`,
  ]
}

async function tableExists(client: pg.Client, table: string): Promise<boolean> {
  const r = await client.query(`SELECT to_regclass($1) AS t`, [table])
  return Boolean(r.rows[0]?.t)
}

async function hasColumn(client: pg.Client, table: string, column: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  return r.rowCount !== null && r.rowCount > 0
}

async function columnUdt(client: pg.Client, table: string, column: string): Promise<string | null> {
  const r = await client.query<{ udt_name: string }>(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  return r.rows[0]?.udt_name ?? null
}

/** Ensure enum type exists with clean/bordered/table; return quoted type name. */
async function ensureStyleEnum(client: pg.Client, preferredName: string): Promise<string> {
  const exists = await client.query<{ typname: string }>(
    `SELECT typname FROM pg_type WHERE typname = $1`,
    [preferredName],
  )
  if (!exists.rowCount) {
    if (dryRun) {
      console.log(`[dry-run] CREATE TYPE ${preferredName} AS ENUM (...)`)
      return preferredName
    }
    await client.query(
      `CREATE TYPE "${preferredName}" AS ENUM ('clean', 'bordered', 'table')`,
    )
    console.log(`created enum ${preferredName}`)
    return preferredName
  }

  // Add missing labels if older enum somehow exists incomplete.
  for (const value of STYLE_VALUES) {
    const has = await client.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = $1 AND e.enumlabel = $2`,
      [preferredName, value],
    )
    if (has.rowCount) continue
    if (dryRun) {
      console.log(`[dry-run] ALTER TYPE ${preferredName} ADD VALUE '${value}'`)
      continue
    }
    await client.query(`ALTER TYPE "${preferredName}" ADD VALUE '${value}'`)
    console.log(`${preferredName}: added '${value}'`)
  }
  return preferredName
}

async function migrateTable(client: pg.Client, table: string): Promise<number> {
  if (!(await tableExists(client, table))) return 0

  const hasBorders = await hasColumn(client, table, 'borders')
  const hasStyle = await hasColumn(client, table, 'style')

  // Already on style-only schema.
  if (hasStyle && !hasBorders) {
    console.log(`${table}: style present, borders gone — skip`)
    return 0
  }

  // Prefer Payload's eventual enum name pattern; reuse if style already typed.
  let enumName = 'enum_stranky_blocks_three_columns_style'
  if (hasStyle) {
    const udt = await columnUdt(client, table, 'style')
    if (udt && !udt.startsWith('_')) enumName = udt
  }
  // Per-table enum names differ (stranky / workshopy / projekty / version tables).
  // Derive from table when creating fresh.
  if (!hasStyle) {
    enumName = `enum_${table}_style`
  }
  await ensureStyleEnum(client, enumName)

  if (!hasStyle) {
    if (dryRun) {
      console.log(`[dry-run] ALTER ${table} ADD style ${enumName} DEFAULT 'clean'`)
    } else {
      await client.query(
        `ALTER TABLE "${table}" ADD COLUMN style "${enumName}" DEFAULT 'clean' NOT NULL`,
      )
      console.log(`${table}: added style`)
    }
  }

  if (!hasBorders) {
    // style added with default clean — nothing to copy
    return 0
  }

  if (dryRun) {
    const counts = await client.query<{ borders: boolean; n: string }>(
      `SELECT borders, COUNT(*)::text AS n FROM "${table}" GROUP BY borders`,
    )
    for (const row of counts.rows) {
      const dest = row.borders ? 'bordered' : 'clean'
      console.log(`[dry-run] ${table}: ${row.n} row(s) borders=${row.borders} → style=${dest}`)
    }
    console.log(`[dry-run] ALTER ${table} DROP borders`)
    return counts.rows.reduce((sum, r) => sum + Number(r.n), 0)
  }

  const updated = await client.query(
    `UPDATE "${table}"
     SET style = CASE WHEN borders IS TRUE THEN 'bordered'::"${enumName}"
                      ELSE 'clean'::"${enumName}" END`,
  )
  const n = updated.rowCount ?? 0
  console.log(`${table}: migrated ${n} row(s) borders → style`)

  await client.query(`ALTER TABLE "${table}" DROP COLUMN borders`)
  console.log(`${table}: dropped borders`)
  return n
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    let total = 0
    for (const collection of COLLECTIONS) {
      for (const table of tablesFor(collection)) {
        total += await migrateTable(client, table)
      }
    }
    console.log(
      dryRun ? `Dry run done — would touch ${total} row(s)` : `Done — touched ${total} row(s)`,
    )
  } finally {
    await client.end()
  }
}

if (process.argv.includes('--self-check')) {
  // ponytail: pure mapping check — no DB.
  const map = (borders: boolean | null | undefined) =>
    borders === true ? 'bordered' : 'clean'
  if (map(false) !== 'clean') throw new Error('false → clean')
  if (map(null) !== 'clean') throw new Error('null → clean')
  if (map(undefined) !== 'clean') throw new Error('undefined → clean')
  if (map(true) !== 'bordered') throw new Error('true → bordered')
  console.log('self-check ok')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
