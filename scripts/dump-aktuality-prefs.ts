import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const col = payload.collections['aktuality']?.config
  console.log('LIVE defaultColumns', col?.admin?.defaultColumns)
  console.log('LIVE defaultSort', col?.defaultSort)

  const prefs = await payload.find({
    collection: 'payload-preferences',
    depth: 1,
    limit: 200,
    pagination: false,
  })

  for (const doc of prefs.docs) {
    const key = String(doc.key || '')
    if (!key.startsWith('collection-')) continue
    console.log('--- pref', doc.id, key, 'user', JSON.stringify(doc.user))
    console.log(JSON.stringify(doc.value, null, 2)?.slice(0, 400))
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
