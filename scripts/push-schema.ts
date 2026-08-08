/**
 * One-shot schema push for local Postgres.
 * Auto-picks "create column", auto-accepts data-loss confirm.
 *
 * Usage: npm run db:push
 */
import 'dotenv/config'
import { createRequire } from 'node:module'
import { emitKeypressEvents } from 'node:readline'

process.env.PAYLOAD_DATABASE_PUSH = 'true'
process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

// Same `prompts` instance @payloadcms/drizzle uses (inject must hit that copy)
const require = createRequire(import.meta.url)
const prompts = require(
  require.resolve('prompts', {
    paths: [require.resolve('@payloadcms/drizzle')],
  }),
)
prompts.inject([true, true, true, true, true, true, true, true])

emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) {
  try {
    process.stdin.setRawMode(true)
  } catch {
    // non-TTY ok
  }
}
process.stdin.resume()

// Drizzle create-vs-rename UI: Enter on first option ("create column")
const tick = setInterval(() => {
  process.stdin.emit('keypress', '\r', {
    name: 'return',
    ctrl: false,
    meta: false,
    shift: false,
    sequence: '\r',
  })
}, 50)

const { getPayload } = await import('payload')
const config = (await import('@payload-config')).default

try {
  const payload = await getPayload({ config })
  payload.logger.info('Database schema push finished.')
  await payload.db.destroy?.()
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  clearInterval(tick)
  process.exit(process.exitCode ?? 0)
}
