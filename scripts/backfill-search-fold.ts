/**
 * Backfill searchFold via SQL (avoids Payload unique/validation on partial update).
 * Run after `pnpm db:push` when searchFold column is new.
 *
 * Usage: pnpm exec tsx scripts/backfill-search-fold.ts
 */
import 'dotenv/config'

import pg from 'pg'

import { foldDiacritics } from '../src/lib/diacritics'

type Row = Record<string, string | null>

function foldRow(row: Row, columns: string[]): string {
  const parts = columns
    .map((col) => row[col])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  return foldDiacritics(parts.join(' ')).replace(/\s+/g, ' ').trim()
}

/** Main table → source columns for searchFold. */
const TABLES: { table: string; sources: string[]; versionTable?: string }[] = [
  { table: 'stranky', sources: ['title', 'slug', 'excerpt', 'description'], versionTable: '_stranky_v' },
  {
    table: 'aktuality',
    sources: ['title', 'slug', 'excerpt', 'description', 'author_name'],
    versionTable: '_aktuality_v',
  },
  {
    table: 'kalendar',
    sources: ['title', 'slug', 'excerpt', 'description'],
    versionTable: '_kalendar_v',
  },
  { table: 'projekty', sources: ['title', 'slug', 'excerpt', 'description'], versionTable: '_projekty_v' },
  {
    table: 'workshopy',
    sources: ['title', 'slug', 'excerpt', 'description'],
    versionTable: '_workshopy_v',
  },
  {
    table: 'publikace',
    sources: ['title', 'slug', 'excerpt', 'description', 'author_name'],
    versionTable: '_publikace_v',
  },
  { table: 'lide', sources: ['name', 'slug', 'role', 'email'], versionTable: '_lide_v' },
  { table: 'sites', sources: ['name', 'slug'], versionTable: '_sites_v' },
  { table: 'media', sources: ['alt', 'filename'] },
  { table: 'tags', sources: ['title', 'slug'] },
  { table: 'workshop_audiences', sources: ['title', 'slug'] },
  { table: 'publication_types', sources: ['title', 'slug'] },
  { table: 'prehledy', sources: ['title', 'collection_key'] },
  { table: 'site_navigace', sources: ['title'] },
  { table: 'site_kontakt', sources: ['title'] },
  { table: 'site_paticka', sources: ['title'] },
]

async function backfillMain(
  client: pg.Client,
  table: string,
  sources: string[],
): Promise<number> {
  const cols = ['id', ...sources]
  const result = await client.query<Row>(`select ${cols.join(', ')} from "${table}"`)
  let updated = 0
  for (const row of result.rows) {
    const fold = foldRow(row, sources)
    await client.query(`update "${table}" set search_fold = $1 where id = $2`, [fold || null, row.id])
    updated += 1
  }
  return updated
}

async function backfillVersions(
  client: pg.Client,
  versionTable: string,
  sources: string[],
): Promise<number> {
  const versionCols = sources.map((c) => `version_${c}`)
  const selectCols = ['id', ...versionCols]
  // Some version columns may not exist (e.g. author_name naming).
  const existing = await client.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_name = $1 and column_name = any($2::text[])`,
    [versionTable, versionCols],
  )
  const present = new Set(existing.rows.map((r) => r.column_name))
  const usable = versionCols.filter((c) => present.has(c))
  if (!usable.length || !present.has('version_search_fold') && !(await hasColumn(client, versionTable, 'version_search_fold'))) {
    // still try version_search_fold
  }
  const hasFold = await hasColumn(client, versionTable, 'version_search_fold')
  if (!hasFold) return 0

  const result = await client.query<Row>(
    `select id, ${usable.join(', ')} from "${versionTable}"`,
  )
  let updated = 0
  for (const row of result.rows) {
    const fold = foldRow(row, usable)
    await client.query(`update "${versionTable}" set version_search_fold = $1 where id = $2`, [
      fold || null,
      row.id,
    ])
    updated += 1
  }
  return updated
}

async function hasColumn(client: pg.Client, table: string, column: string): Promise<boolean> {
  const r = await client.query(
    `select 1 from information_schema.columns where table_name = $1 and column_name = $2 limit 1`,
    [table, column],
  )
  return r.rowCount > 0
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  for (const { table, sources, versionTable } of TABLES) {
    const has = await hasColumn(client, table, 'search_fold')
    if (!has) {
      console.log(`${table}: skip (no search_fold)`)
      continue
    }
    // Only use source columns that exist
    const existing = await client.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_name = $1 and column_name = any($2::text[])`,
      [table, sources],
    )
    const usable = existing.rows.map((r) => r.column_name)
    const n = await backfillMain(client, table, usable)
    let vn = 0
    if (versionTable) {
      vn = await backfillVersions(client, versionTable, usable)
    }
    console.log(`${table}: ${n} rows` + (versionTable ? `, ${versionTable}: ${vn} versions` : ''))
  }

  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
