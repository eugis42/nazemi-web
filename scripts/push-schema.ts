/**
 * One-shot schema push for local / prod Postgres.
 *
 * Drizzle-kit create-vs-rename prompts use hanji (not the `prompts` package).
 * Run via `npm run db:push` → `scripts/db-push-pty.py` so Enter selects "create".
 *
 * Usage: npm run db:push
 *        npm run db:push:inner   # TTY only — answer prompts yourself
 */
import 'dotenv/config'
import { createRequire } from 'node:module'

process.env.PAYLOAD_DATABASE_PUSH = 'false'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

// Accept Payload/drizzle warning confirms (`prompts` package only).
const require = createRequire(import.meta.url)
const prompts = require(
  require.resolve('prompts', {
    paths: [require.resolve('@payloadcms/drizzle')],
  }),
)
prompts.inject([true, true, true, true, true, true, true, true, true, true])

const { getPayload } = await import('payload')
const config = (await import('@payload-config')).default

try {
  const payload = await getPayload({ config })
  const adapter = payload.db as {
    requireDrizzleKit: () => { pushSchema: (...args: unknown[]) => Promise<{
      apply: () => Promise<void>
      hasDataLoss: boolean
      warnings: string[]
    }> }
    schema: unknown
    drizzle: unknown
    schemaName?: string
    tablesFilter?: unknown
    extensions?: { postgis?: boolean }
  }

  const { pushSchema } = adapter.requireDrizzleKit()
  const { apply, hasDataLoss, warnings } = await pushSchema(
    adapter.schema,
    adapter.drizzle,
    adapter.schemaName ? [adapter.schemaName] : undefined,
    adapter.tablesFilter,
    adapter.extensions?.postgis ? ['postgis'] : undefined,
  )

  if (warnings.length) {
    payload.logger.warn(
      `Schema push warnings (${warnings.length})${hasDataLoss ? ' DATA LOSS possible' : ''}`,
    )
  }

  await apply()
  payload.logger.info('Database schema push finished.')
  await payload.db.destroy?.()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  process.exit(process.exitCode ?? 0)
}
