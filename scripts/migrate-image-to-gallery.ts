/**
 * Migrate Obrázkový (`image`) blocks → Galerie (`gallery`).
 * Copies block rows + wires single `image_id` into hasMany `images` via *_rels.
 *
 * Usage: npx tsx scripts/migrate-image-to-gallery.ts
 */
import 'dotenv/config'
import pg from 'pg'

const tables = [
  {
    image: 'stranky_blocks_image',
    gallery: 'stranky_blocks_gallery',
    rels: 'stranky_rels',
    parentCol: 'parent_id',
  },
  {
    image: '_stranky_v_blocks_image',
    gallery: '_stranky_v_blocks_gallery',
    rels: '_stranky_v_rels',
    parentCol: 'parent_id',
  },
  {
    image: 'workshopy_blocks_image',
    gallery: 'workshopy_blocks_gallery',
    rels: 'workshopy_rels',
    parentCol: 'parent_id',
  },
  {
    image: '_workshopy_v_blocks_image',
    gallery: '_workshopy_v_blocks_gallery',
    rels: '_workshopy_v_rels',
    parentCol: 'parent_id',
  },
] as const

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()

  try {
    for (const t of tables) {
      const exists = await c.query(
        `SELECT to_regclass($1) AS img, to_regclass($2) AS gal`,
        [t.image, t.gallery],
      )
      if (!exists.rows[0]?.img || !exists.rows[0]?.gal) {
        console.log(`skip ${t.image} (missing table)`)
        continue
      }

      const rows = await c.query(
        `SELECT _order, _parent_id, _path, id, image_id, caption, block_name FROM ${t.image}`,
      )
      if (rows.rowCount === 0) {
        console.log(`${t.image}: 0 rows`)
        continue
      }

      for (const row of rows.rows) {
        await c.query(
          `INSERT INTO ${t.gallery} (_order, _parent_id, _path, id, columns, caption, block_name)
           VALUES ($1, $2, $3, $4, '2', $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [row._order, row._parent_id, row._path, row.id, row.caption, row.block_name],
        )

        if (row.image_id != null) {
          await c.query(
            `INSERT INTO ${t.rels} ("order", ${t.parentCol}, path, media_id)
             VALUES (0, $1, 'blocks.images', $2)`,
            [row._parent_id, row.image_id],
          )
        }
      }

      console.log(`${t.image} → ${t.gallery}: migrated ${rows.rowCount} row(s)`)
    }
  } finally {
    await c.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
