/**
 * Unify threeColumns + threeCards → one Sloupce block (`threeColumns` slug).
 *
 * - Add `borders` on threeColumns (false default; true for former cards)
 * - Move column headline/prefix/title into Lexical body as leading H2
 * - Copy threeCards rows → threeColumns (+ nested columns + actions)
 * - Clear old headline/prefix/title (db:push drops those columns later)
 *
 * **Run BEFORE deploy / restart with the new schema** (Payload only loads
 * block types still in config — unmigrated threeCards rows would vanish).
 *
 * Order (local + novy.nazemi.cz):
 *   1. npx tsx scripts/migrate-sloupce-unify.ts --dry-run
 *   2. npx tsx scripts/migrate-sloupce-unify.ts
 *   3. Deploy / restart app with this commit
 *   4. npm run db:push   # drop threeCards tables + old column fields
 *
 * Build on your machine — don't overload the VPS with `next build`.
 *
 * Idempotent — safe to re-run.
 *
 * Usage: npx tsx scripts/migrate-sloupce-unify.ts
 *        npx tsx scripts/migrate-sloupce-unify.ts --dry-run
 *        npx tsx scripts/migrate-sloupce-unify.ts --self-check
 */
import 'dotenv/config'
import pg from 'pg'

type LexicalValue = Record<string, unknown>

const dryRun = process.argv.includes('--dry-run')

const COLLECTIONS = ['stranky', 'workshopy', 'projekty'] as const

function isLexicalRoot(value: unknown): value is LexicalValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const root = (value as { root?: unknown }).root
  return Boolean(root && typeof root === 'object' && !Array.isArray(root))
}

function emptyLexical(): LexicalValue {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [],
    },
  }
}

export function makeHeadingH2(text: string): Record<string, unknown> {
  return {
    type: 'heading',
    tag: 'h2',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'text',
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        version: 1,
      },
    ],
  }
}

export function joinHeadingParts(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(' ')
}

function headingTextOf(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null
  const n = node as { type?: string; tag?: string; children?: { text?: string }[] }
  if (n.type !== 'heading' || n.tag !== 'h2') return null
  return (n.children || [])
    .map((c) => (typeof c?.text === 'string' ? c.text : ''))
    .join('')
    .trim()
}

/** Prepend H2 unless body already starts with the same heading text. */
export function prependH2(body: unknown, headingText: string): LexicalValue {
  const trimmed = headingText.trim()
  if (!trimmed) {
    return isLexicalRoot(body) ? body : emptyLexical()
  }

  const base = isLexicalRoot(body) ? structuredClone(body) : emptyLexical()
  const root = base.root as { children: unknown[] }
  const kids = Array.isArray(root.children) ? root.children : []
  if (headingTextOf(kids[0]) === trimmed) {
    root.children = kids
    return base
  }
  root.children = [makeHeadingH2(trimmed), ...kids]
  return base
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

async function ensureBordersColumn(client: pg.Client, table: string): Promise<void> {
  if (!(await tableExists(client, table))) return
  if (await hasColumn(client, table, 'borders')) return
  if (dryRun) {
    console.log(`[dry-run] ALTER ${table} ADD borders boolean DEFAULT false`)
    return
  }
  await client.query(
    `ALTER TABLE "${table}" ADD COLUMN borders boolean DEFAULT false NOT NULL`,
  )
  console.log(`${table}: added borders`)
}

async function migrateColumnsHeadings(
  client: pg.Client,
  table: string,
  kind: 'columns' | 'cards',
): Promise<number> {
  if (!(await tableExists(client, table))) return 0

  const hasHeadline = await hasColumn(client, table, 'headline')
  const hasPrefix = await hasColumn(client, table, 'prefix')
  const hasTitle = await hasColumn(client, table, 'title')
  if (!hasHeadline && !hasPrefix && !hasTitle) return 0

  const selectCols = ['id', 'body']
  if (hasHeadline) selectCols.push('headline')
  if (hasPrefix) selectCols.push('prefix')
  if (hasTitle) selectCols.push('title')

  const rows = await client.query<Record<string, unknown>>(
    `SELECT ${selectCols.map((c) => `"${c}"`).join(', ')} FROM "${table}"`,
  )

  let updated = 0
  for (const row of rows.rows) {
    const line1 =
      kind === 'columns'
        ? (row.headline as string | null | undefined)
        : (row.prefix as string | null | undefined)
    const line2 = row.title as string | null | undefined
    const heading = joinHeadingParts(line1, line2)
    if (!heading) continue

    const nextBody = prependH2(row.body, heading)
    if (dryRun) {
      console.log(`[dry-run] ${table} id=${row.id} H2 ← ${heading}`)
      updated += 1
      continue
    }

    const clears: string[] = []
    const params: unknown[] = [JSON.stringify(nextBody), row.id]
    if (hasHeadline) clears.push('headline = NULL')
    if (hasPrefix) clears.push('prefix = NULL')
    if (hasTitle) clears.push('title = NULL')

    await client.query(
      `UPDATE "${table}" SET body = $1::jsonb${clears.length ? `, ${clears.join(', ')}` : ''} WHERE id = $2`,
      params,
    )
    updated += 1
  }
  return updated
}

type BlockPair = {
  cards: string
  columns: string
  cardsCols: string
  columnsCols: string
  cardsActions: string
  columnsActions: string
  version: boolean
}

function pairsFor(collection: string): BlockPair[] {
  const live: BlockPair = {
    cards: `${collection}_blocks_three_cards`,
    columns: `${collection}_blocks_three_columns`,
    cardsCols: `${collection}_blocks_three_cards_columns`,
    columnsCols: `${collection}_blocks_three_columns_columns`,
    cardsActions: `${collection}_blocks_three_cards_columns_actions`,
    columnsActions: `${collection}_blocks_three_columns_columns_actions`,
    version: false,
  }
  const ver: BlockPair = {
    cards: `_${collection}_v_blocks_three_cards`,
    columns: `_${collection}_v_blocks_three_columns`,
    cardsCols: `_${collection}_v_blocks_three_cards_columns`,
    columnsCols: `_${collection}_v_blocks_three_columns_columns`,
    cardsActions: `_${collection}_v_blocks_three_cards_columns_actions`,
    columnsActions: `_${collection}_v_blocks_three_columns_columns_actions`,
    version: true,
  }
  return [live, ver]
}

async function migrateCardsPair(client: pg.Client, pair: BlockPair): Promise<number> {
  if (!(await tableExists(client, pair.cards))) return 0
  if (!(await tableExists(client, pair.columns))) {
    console.log(`skip ${pair.cards}: target ${pair.columns} missing`)
    return 0
  }

  await ensureBordersColumn(client, pair.columns)

  const blocks = await client.query<Record<string, unknown>>(
    `SELECT * FROM "${pair.cards}" ORDER BY id`,
  )
  if (!blocks.rowCount) return 0

  let moved = 0
  for (const block of blocks.rows) {
    const blockId = block.id

    if (dryRun) {
      console.log(
        `[dry-run] ${pair.cards} id=${blockId} → ${pair.columns} borders=true title=${block.title ?? ''}`,
      )
      moved += 1
      continue
    }

    // Idempotent: same block slot already a threeColumns row?
    const slot = await client.query<{ id: string | number }>(
      `SELECT id FROM "${pair.columns}"
       WHERE _parent_id = $1 AND _path = $2 AND _order = $3`,
      [block._parent_id, block._path, block._order],
    )
    let newBlockId: string | number = blockId as string | number

    if (slot.rowCount) {
      newBlockId = slot.rows[0]!.id
      // Ensure borders=true on the occupying row (live UUID reuse case).
      await client.query(`UPDATE "${pair.columns}" SET borders = true WHERE id = $1`, [
        newBlockId,
      ])
      console.log(
        `slot ${_parentPath(block)} already in ${pair.columns} id=${newBlockId} — set borders`,
      )
    } else if (pair.version) {
      // Version tables use per-table serial ints — never reuse cards id (collides).
      const hasUuid = await hasColumn(client, pair.columns, '_uuid')
      const inserted = hasUuid
        ? await client.query<{ id: number }>(
            `INSERT INTO "${pair.columns}"
               (_order, _parent_id, _path, title, borders, _uuid, block_name)
             VALUES ($1, $2, $3, $4, true, $5, $6)
             RETURNING id`,
            [
              block._order,
              block._parent_id,
              block._path,
              block.title,
              block._uuid,
              block.block_name,
            ],
          )
        : await client.query<{ id: number }>(
            `INSERT INTO "${pair.columns}"
               (_order, _parent_id, _path, title, borders, block_name)
             VALUES ($1, $2, $3, $4, true, $5)
             RETURNING id`,
            [block._order, block._parent_id, block._path, block.title, block.block_name],
          )
      newBlockId = inserted.rows[0]!.id
    } else {
      // Live: keep same varchar id so rels paths stay valid.
      await client.query(
        `INSERT INTO "${pair.columns}"
           (_order, _parent_id, _path, id, title, borders, block_name)
         VALUES ($1, $2, $3, $4, $5, true, $6)`,
        [
          block._order,
          block._parent_id,
          block._path,
          block.id,
          block.title,
          block.block_name,
        ],
      )
      newBlockId = blockId as string
    }

    if (await tableExists(client, pair.cardsCols)) {
      const cols = await client.query<Record<string, unknown>>(
        `SELECT * FROM "${pair.cardsCols}" WHERE _parent_id = $1 ORDER BY _order`,
        [blockId],
      )
      for (const col of cols.rows) {
        const heading = joinHeadingParts(
          col.prefix as string | undefined,
          col.title as string | undefined,
        )
        const body = heading ? prependH2(col.body, heading) : col.body

        // Live: reuse column id. Version: new serial + remap actions.
        let newColId: string | number = col.id as string | number
        const hasUuid = await hasColumn(client, pair.columnsCols, '_uuid')
        const hasHeadline = await hasColumn(client, pair.columnsCols, 'headline')

        if (pair.version) {
          const existingCol = await client.query<{ id: number }>(
            `SELECT id FROM "${pair.columnsCols}"
             WHERE _parent_id = $1 AND _order = $2`,
            [newBlockId, col._order],
          )
          if (existingCol.rowCount) {
            newColId = existingCol.rows[0]!.id
            await client.query(
              `UPDATE "${pair.columnsCols}" SET body = $1::jsonb WHERE id = $2`,
              [JSON.stringify(body), newColId],
            )
          } else if (hasUuid && hasHeadline) {
            const ins = await client.query<{ id: number }>(
              `INSERT INTO "${pair.columnsCols}"
                 (_order, _parent_id, headline, title, body, _uuid)
               VALUES ($1, $2, NULL, NULL, $3::jsonb, $4)
               RETURNING id`,
              [col._order, newBlockId, JSON.stringify(body), col._uuid],
            )
            newColId = ins.rows[0]!.id
          } else if (hasUuid) {
            const ins = await client.query<{ id: number }>(
              `INSERT INTO "${pair.columnsCols}"
                 (_order, _parent_id, body, _uuid)
               VALUES ($1, $2, $3::jsonb, $4)
               RETURNING id`,
              [col._order, newBlockId, JSON.stringify(body), col._uuid],
            )
            newColId = ins.rows[0]!.id
          } else if (hasHeadline) {
            const ins = await client.query<{ id: number }>(
              `INSERT INTO "${pair.columnsCols}"
                 (_order, _parent_id, headline, title, body)
               VALUES ($1, $2, NULL, NULL, $3::jsonb)
               RETURNING id`,
              [col._order, newBlockId, JSON.stringify(body)],
            )
            newColId = ins.rows[0]!.id
          } else {
            const ins = await client.query<{ id: number }>(
              `INSERT INTO "${pair.columnsCols}"
                 (_order, _parent_id, body)
               VALUES ($1, $2, $3::jsonb)
               RETURNING id`,
              [col._order, newBlockId, JSON.stringify(body)],
            )
            newColId = ins.rows[0]!.id
          }
        } else {
          const colExists = await client.query(
            `SELECT 1 FROM "${pair.columnsCols}" WHERE id = $1`,
            [col.id],
          )
          if (!colExists.rowCount) {
            if (hasHeadline) {
              await client.query(
                `INSERT INTO "${pair.columnsCols}"
                   (_order, _parent_id, id, headline, title, body)
                 VALUES ($1, $2, $3, NULL, NULL, $4::jsonb)`,
                [col._order, newBlockId, col.id, JSON.stringify(body)],
              )
            } else {
              await client.query(
                `INSERT INTO "${pair.columnsCols}"
                   (_order, _parent_id, id, body)
                 VALUES ($1, $2, $3, $4::jsonb)`,
                [col._order, newBlockId, col.id, JSON.stringify(body)],
              )
            }
          } else {
            await client.query(
              `UPDATE "${pair.columnsCols}" SET body = $1::jsonb, _parent_id = $2 WHERE id = $3`,
              [JSON.stringify(body), newBlockId, col.id],
            )
          }
          newColId = col.id as string
        }

        if (await tableExists(client, pair.cardsActions)) {
          const actions = await client.query<Record<string, unknown>>(
            `SELECT * FROM "${pair.cardsActions}" WHERE _parent_id = $1 ORDER BY _order`,
            [col.id],
          )
          const variantType = await enumType(client, pair.columnsActions, 'variant')
          const linkType = await enumType(client, pair.columnsActions, 'link_type')
          const hasUuidA = await hasColumn(client, pair.columnsActions, '_uuid')

          for (const action of actions.rows) {
            if (pair.version) {
              const aExists = await client.query(
                `SELECT 1 FROM "${pair.columnsActions}"
                 WHERE _parent_id = $1 AND _order = $2`,
                [newColId, action._order],
              )
              if (aExists.rowCount) continue
              if (hasUuidA) {
                await client.query(
                  `INSERT INTO "${pair.columnsActions}"
                     (_order, _parent_id, label, href, variant, link_type, background_color, _uuid)
                   VALUES (
                     $1, $2, $3, $4,
                     $5::text::${variantType},
                     $6::text::${linkType},
                     $7, $8
                   )`,
                  [
                    action._order,
                    newColId,
                    action.label,
                    action.href,
                    action.variant,
                    action.link_type,
                    action.background_color,
                    action._uuid,
                  ],
                )
              } else {
                await client.query(
                  `INSERT INTO "${pair.columnsActions}"
                     (_order, _parent_id, label, href, variant, link_type, background_color)
                   VALUES (
                     $1, $2, $3, $4,
                     $5::text::${variantType},
                     $6::text::${linkType},
                     $7
                   )`,
                  [
                    action._order,
                    newColId,
                    action.label,
                    action.href,
                    action.variant,
                    action.link_type,
                    action.background_color,
                  ],
                )
              }
            } else {
              const aExists = await client.query(
                `SELECT 1 FROM "${pair.columnsActions}" WHERE id = $1`,
                [action.id],
              )
              if (aExists.rowCount) continue
              await client.query(
                `INSERT INTO "${pair.columnsActions}"
                   (_order, _parent_id, id, label, href, variant, link_type, background_color)
                 VALUES (
                   $1, $2, $3, $4, $5,
                   $6::text::${variantType},
                   $7::text::${linkType},
                   $8
                 )`,
                [
                  action._order,
                  newColId,
                  action.id,
                  action.label,
                  action.href,
                  action.variant,
                  action.link_type,
                  action.background_color,
                ],
              )
            }
          }
        }
      }
    }

    await client.query(`DELETE FROM "${pair.cards}" WHERE id = $1`, [blockId])
    moved += 1
  }

  if (!dryRun && (await tableExists(client, pair.cardsActions))) {
    await client.query(`DELETE FROM "${pair.cardsActions}"`)
  }
  if (!dryRun && (await tableExists(client, pair.cardsCols))) {
    await client.query(`DELETE FROM "${pair.cardsCols}"`)
  }

  return moved
}

function _parentPath(block: Record<string, unknown>): string {
  return `${block._parent_id}/${block._path}/#${block._order}`
}

async function enumType(
  client: pg.Client,
  table: string,
  column: string,
): Promise<string> {
  const r = await client.query<{ udt_name: string }>(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  const name = r.rows[0]?.udt_name
  if (!name) throw new Error(`missing enum type for ${table}.${column}`)
  return `"${name}"`
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    let headingUpdates = 0
    let cardsMoved = 0

    for (const collection of COLLECTIONS) {
      for (const pair of pairsFor(collection)) {
        await ensureBordersColumn(client, pair.columns)

        // 1) Headings on existing threeColumns
        const nCols = await migrateColumnsHeadings(client, pair.columnsCols, 'columns')
        if (nCols) console.log(`${pair.columnsCols}: H2-migrated ${nCols} column(s)`)
        headingUpdates += nCols

        // 2) Headings on cards (so copy gets H2 even if we skip prepend in copy)
        const nCards = await migrateColumnsHeadings(client, pair.cardsCols, 'cards')
        if (nCards) console.log(`${pair.cardsCols}: H2-migrated ${nCards} column(s)`)
        headingUpdates += nCards

        // 3) Move cards → columns
        const moved = await migrateCardsPair(client, pair)
        if (moved) console.log(`${pair.cards} → ${pair.columns}: moved ${moved} block(s)`)
        cardsMoved += moved
      }
    }

    console.log(
      dryRun
        ? `Dry run done — would H2-update ${headingUpdates}, move ${cardsMoved} card block(s)`
        : `Done — H2-updated ${headingUpdates}, moved ${cardsMoved} card block(s)`,
    )
  } finally {
    await client.end()
  }
}

if (process.argv.includes('--self-check')) {
  const h = joinHeadingParts('150+', 'organizací')
  if (h !== '150+ organizací') throw new Error(`join fail: ${h}`)
  const once = prependH2(emptyLexical(), h)
  const twice = prependH2(once, h)
  const kids = (twice.root as { children: unknown[] }).children
  if (kids.length !== 1) throw new Error(`expected 1 child after idempotent prepend, got ${kids.length}`)
  if (headingTextOf(kids[0]) !== h) throw new Error('heading text mismatch')
  console.log('self-check ok')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
