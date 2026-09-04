/**
 * One-shot: nested mainMenu children → flat rows with depth 0|1.
 * Run BEFORE or WITH schema push that drops `children` / adds `depth`.
 *
 *   pnpm exec tsx scripts/flatten-site-menus.ts
 */
import 'dotenv/config'

import { Client } from 'pg'

function databaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL missing')
  return url
}

async function main() {
  const client = new Client({ connectionString: databaseUrl() })
  await client.connect()

  try {
    await client.query('BEGIN')

    // depth column (Payload push also adds it; IF NOT EXISTS keeps script re-runnable)
    await client.query(`
      ALTER TABLE sites_main_menu
      ADD COLUMN IF NOT EXISTS depth numeric DEFAULT 0
    `)
    await client.query(`
      ALTER TABLE IF EXISTS _sites_v_version_main_menu
      ADD COLUMN IF NOT EXISTS depth numeric DEFAULT 0
    `)

    const parents = await client.query<{
      id: string
      _parent_id: number
      _order: number
      label: string | null
      href: string | null
      link_type: string | null
    }>(`
      SELECT id, _parent_id, _order, label, href, link_type
      FROM sites_main_menu
      ORDER BY _parent_id, _order
    `)

    const children = await client.query<{
      id: string
      _parent_id: string
      _order: number
      label: string | null
      href: string | null
      link_type: string | null
    }>(`
      SELECT id, _parent_id, _order, label, href, link_type
      FROM sites_main_menu_children
      ORDER BY _parent_id, _order
    `)

    if (children.rows.length === 0) {
      console.log('No nested children — nothing to flatten.')
      await client.query('COMMIT')
      return
    }

    const kidsByParent = new Map<string, typeof children.rows>()
    for (const child of children.rows) {
      const list = kidsByParent.get(child._parent_id) || []
      list.push(child)
      kidsByParent.set(child._parent_id, list)
    }

    // Group parents by site
    const bySite = new Map<number, typeof parents.rows>()
    for (const row of parents.rows) {
      const list = bySite.get(row._parent_id) || []
      list.push(row)
      bySite.set(row._parent_id, list)
    }

    for (const [siteId, siteParents] of bySite) {
      type Flat = {
        id: string
        label: string | null
        href: string | null
        link_type: string | null
        depth: number
        wasChild: boolean
        oldParentMenuId?: string
      }
      const flat: Flat[] = []
      for (const parent of siteParents) {
        flat.push({
          id: parent.id,
          label: parent.label,
          href: parent.href,
          link_type: parent.link_type,
          depth: 0,
          wasChild: false,
        })
        for (const child of kidsByParent.get(parent.id) || []) {
          flat.push({
            id: child.id,
            label: child.label,
            href: child.href,
            link_type: child.link_type,
            depth: 1,
            wasChild: true,
            oldParentMenuId: parent.id,
          })
        }
      }

      // Children rows live in children table — insert into main_menu, then delete children
      await client.query(`DELETE FROM sites_main_menu WHERE _parent_id = $1`, [siteId])

      let order = 1
      for (const item of flat) {
        await client.query(
          `
          INSERT INTO sites_main_menu (id, _parent_id, _order, label, href, link_type, depth)
          VALUES ($1, $2, $3, $4, $5, $6::enum_sites_main_menu_link_type, $7)
          `,
          [item.id, siteId, order, item.label, item.href, item.link_type || 'external', item.depth],
        )
        order += 1
      }

      // Fix relationship paths: mainMenu.N.children.M.reference → mainMenu.K.reference
      const rels = await client.query<{ id: number; path: string }>(
        `SELECT id, path FROM sites_rels WHERE parent_id = $1 AND path LIKE 'mainMenu.%'`,
        [siteId],
      )

      for (const rel of rels.rows) {
        const childMatch = /^mainMenu\.(\d+)\.children\.(\d+)\.reference$/.exec(rel.path)
        if (childMatch) {
          const parentOrder = Number(childMatch[1]) // Payload order is often 1-based in path? check
          // Payload rel paths use 0-based array index
          const parentIndex = Number(childMatch[1])
          const childIndex = Number(childMatch[2])
          const parentRow = siteParents[parentIndex]
          if (!parentRow) continue
          const childRows = kidsByParent.get(parentRow.id) || []
          const childRow = childRows[childIndex]
          if (!childRow) continue
          const newIndex = flat.findIndex((item) => item.id === childRow.id)
          if (newIndex < 0) continue
          await client.query(`UPDATE sites_rels SET path = $1 WHERE id = $2`, [
            `mainMenu.${newIndex}.reference`,
            rel.id,
          ])
          continue
        }

        const topMatch = /^mainMenu\.(\d+)\.reference$/.exec(rel.path)
        if (topMatch) {
          const oldIndex = Number(topMatch[1])
          const parentRow = siteParents[oldIndex]
          if (!parentRow) continue
          const newIndex = flat.findIndex((item) => item.id === parentRow.id)
          if (newIndex < 0 || newIndex === oldIndex) continue
          await client.query(`UPDATE sites_rels SET path = $1 WHERE id = $2`, [
            `mainMenu.${newIndex}.reference`,
            rel.id,
          ])
        }
      }

      console.log(`Site ${siteId}: flattened ${flat.length} menu rows (${children.rows.filter((c) => siteParents.some((p) => p.id === c._parent_id)).length} were children)`)
    }

    await client.query(`DELETE FROM sites_main_menu_children`)

    // Versions: best-effort clear nested version children (draft history may be incomplete)
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = '_sites_v_version_main_menu_children'
        ) THEN
          DELETE FROM _sites_v_version_main_menu_children;
        END IF;
      END $$;
    `)

    await client.query('COMMIT')
    console.log('Done. Next: schema push (drops children tables) + restart admin.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
