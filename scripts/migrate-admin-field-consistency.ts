/**
 * Backup → db:push → restore for admin field consistency renames.
 *
 * 1. npx tsx scripts/migrate-admin-field-consistency.ts backup
 * 2. npm run db:push
 * 3. npx tsx scripts/migrate-admin-field-consistency.ts restore
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { getPayload } from 'payload'
import config from '@payload-config'

const BACKUP = path.resolve('scripts/.admin-field-consistency-backup.json')

type WorkshopRow = { id: number; slug: string; short_description: string | null }
type ProjectLink = {
  parent_id: number
  _order: number
  label: string | null
  href: string | null
  variant: string | null
}
type PublikaceRow = {
  id: number
  slug: string
  cover_id: number | null
  buy_label: string | null
  buy_url: string | null
}
type MenuRow = {
  parent_id: number
  id: string
  _order: number
  label: string | null
  href: string | null
  children?: { id: string; _order: number; label: string | null; href: string | null }[]
}
type ContactRow = { id: string; parent_id: number; content: string | null }

type Backup = {
  workshops: WorkshopRow[]
  projectLinks: ProjectLink[]
  publikace: PublikaceRow[]
  mainMenus: MenuRow[]
  secondaryMenus: Omit<MenuRow, 'children'>[]
  contacts: ContactRow[]
}

async function client() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  return c
}

async function backup() {
  const c = await client()
  try {
    const workshops = (
      await c.query<WorkshopRow>(
        `SELECT id, slug, short_description FROM workshopy WHERE short_description IS NOT NULL`,
      )
    ).rows

    const projectLinks = (
      await c.query<ProjectLink>(
        `SELECT _parent_id AS parent_id, _order, label, href, variant::text AS variant
         FROM projekty_links ORDER BY _parent_id, _order`,
      )
    ).rows

    const publikace = (
      await c.query<PublikaceRow>(
        `SELECT id, slug, cover_id, buy_label, buy_url FROM publikace
         WHERE cover_id IS NOT NULL OR buy_label IS NOT NULL OR buy_url IS NOT NULL`,
      )
    ).rows

    const mainParents = (
      await c.query<{
        parent_id: number
        id: string
        _order: number
        label: string | null
        href: string | null
      }>(
        `SELECT _parent_id AS parent_id, id, _order, label, href FROM sites_main_menu ORDER BY _parent_id, _order`,
      )
    ).rows

    const mainMenus: MenuRow[] = []
    for (const row of mainParents) {
      const children = (
        await c.query<{ id: string; _order: number; label: string | null; href: string | null }>(
          `SELECT id, _order, label, href FROM sites_main_menu_children WHERE _parent_id = $1 ORDER BY _order`,
          [row.id],
        )
      ).rows
      mainMenus.push({ ...row, children })
    }

    const secondaryMenus = (
      await c.query<Omit<MenuRow, 'children'>>(
        `SELECT _parent_id AS parent_id, id, _order, label, href FROM sites_secondary_menu ORDER BY _parent_id, _order`,
      )
    ).rows

    const contacts = (
      await c.query<ContactRow>(
        `SELECT id, _parent_id AS parent_id, content FROM sites_contact_details WHERE content IS NOT NULL`,
      )
    ).rows

    const out: Backup = {
      workshops,
      projectLinks,
      publikace,
      mainMenus,
      secondaryMenus,
      contacts,
    }
    writeFileSync(BACKUP, JSON.stringify(out, null, 2))
    console.log(
      `Backed up → ${BACKUP}\n` +
        `  workshops=${workshops.length} projectLinks=${projectLinks.length} publikace=${publikace.length}\n` +
        `  mainMenus=${mainMenus.length} secondaryMenus=${secondaryMenus.length} contacts=${contacts.length}`,
    )
  } finally {
    await c.end()
  }
}

async function restore() {
  const raw = readFileSync(BACKUP, 'utf8')
  const data = JSON.parse(raw) as Backup
  const payload = await getPayload({ config })
  const c = await client()

  try {
    // Workshopy: short_description → excerpt (SQL if column still has data)
    for (const row of data.workshops) {
      await c.query(
        `UPDATE workshopy SET excerpt = COALESCE(NULLIF(excerpt, ''), $1) WHERE id = $2 AND (excerpt IS NULL OR excerpt = '')`,
        [row.short_description, row.id],
      )
      await c.query(
        `UPDATE _workshopy_v SET version_excerpt = COALESCE(NULLIF(version_excerpt, ''), $1)
         WHERE parent_id = $2 AND (version_excerpt IS NULL OR version_excerpt = '')`,
        [row.short_description, row.id],
      )
      console.log(`workshop excerpt ← short_description: ${row.slug}`)
    }

    // Projekty links → ctas
    const byProject = new Map<number, ProjectLink[]>()
    for (const link of data.projectLinks) {
      const list = byProject.get(link.parent_id) || []
      list.push(link)
      byProject.set(link.parent_id, list)
    }
    for (const [id, links] of byProject) {
      await payload.update({
        collection: 'projekty',
        id,
        data: {
          ctas: links.map((link) => ({
            title: link.label || 'Odkaz',
            url: link.href || '#',
            variant: (link.variant === 'filled' ? 'filled' : 'outline') as 'filled' | 'outline',
          })),
          _status: 'published',
        },
        draft: false,
        overrideAccess: true,
      })
      console.log(`projekty ctas ← links: id=${id} (${links.length})`)
    }

    // Publikace cover + buy → coverImage + ctas
    for (const row of data.publikace) {
      const update: Record<string, unknown> = { _status: 'published' }
      if (row.cover_id) update.coverImage = row.cover_id
      if (row.buy_url || row.buy_label) {
        update.ctas = [
          {
            title: row.buy_label || 'Kde koupit',
            url: row.buy_url || 'https://www.kosmas.cz',
          },
        ]
      }
      await payload.update({
        collection: 'publikace',
        id: row.id,
        data: update,
        draft: false,
        overrideAccess: true,
      })
      console.log(`publikace cover/ctas: ${row.slug}`)
    }

    // Sites menus: ensure link_type = external (keep href)
    await c.query(`UPDATE sites_main_menu SET link_type = 'external' WHERE link_type IS NULL`)
    await c.query(
      `UPDATE sites_main_menu_children SET link_type = 'external' WHERE link_type IS NULL`,
    )
    await c.query(`UPDATE sites_secondary_menu SET link_type = 'external' WHERE link_type IS NULL`)
    await c.query(
      `UPDATE _sites_v_version_main_menu SET link_type = 'external' WHERE link_type IS NULL`,
    )
    await c.query(
      `UPDATE _sites_v_version_main_menu_children SET link_type = 'external' WHERE link_type IS NULL`,
    )
    await c.query(
      `UPDATE _sites_v_version_secondary_menu SET link_type = 'external' WHERE link_type IS NULL`,
    )
    console.log('sites menus: link_type ← external')

    // Contact legacy plain text
    for (const row of data.contacts) {
      await c.query(
        `UPDATE sites_contact_details SET legacy_plain_text = COALESCE(NULLIF(legacy_plain_text, ''), $1) WHERE id = $2`,
        [row.content, row.id],
      )
      console.log(`contact legacyPlainText ← content: ${row.id}`)
    }
    await c.query(
      `UPDATE _sites_v_version_contact_details
       SET legacy_plain_text = COALESCE(NULLIF(legacy_plain_text, ''), content)
       WHERE content IS NOT NULL AND (legacy_plain_text IS NULL OR legacy_plain_text = '')`,
    )
  } finally {
    await c.end()
    await payload.db.destroy?.()
  }

  console.log('Restore done.')
}

const cmd = process.argv[2]
if (cmd === 'backup') await backup()
else if (cmd === 'restore') await restore()
else {
  console.error('Usage: tsx scripts/migrate-admin-field-consistency.ts backup|restore')
  process.exit(1)
}

process.exit(0)
