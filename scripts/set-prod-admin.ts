import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const email = process.env.PROD_ADMIN_EMAIL || 'eugen.korda@me.com'
const password = process.env.PROD_ADMIN_PASSWORD
const name = process.env.PROD_ADMIN_NAME || 'Eugen Korda'

/** Local/seed accounts that must not remain on staging/prod after content restore. */
const SEED_EMAILS = ['admin@nazemi.local', 'test@test.com']

if (!password || password.length < 12) {
  console.error('Set PROD_ADMIN_PASSWORD (min 12 chars) in env.')
  process.exit(1)
}

const payload = await getPayload({ config })

const existing = await payload.find({
  collection: 'users',
  depth: 0,
  limit: 20,
  overrideAccess: true,
  where: {
    or: [{ email: { equals: email } }, ...SEED_EMAILS.map((e) => ({ email: { equals: e } }))],
  },
})

const demo = existing.docs.find((u) => u.email === 'admin@nazemi.local')
const target = existing.docs.find((u) => u.email === email)

if (target) {
  await payload.update({
    collection: 'users',
    id: target.id,
    data: { email, name, password, role: 'admin' },
    overrideAccess: true,
  })
  console.log(`Updated existing admin ${email}`)
} else if (demo) {
  await payload.update({
    collection: 'users',
    id: demo.id,
    data: { email, name, password, role: 'admin' },
    overrideAccess: true,
  })
  console.log(`Converted demo admin → ${email}`)
} else {
  await payload.create({
    collection: 'users',
    data: { email, name, password, role: 'admin' },
    overrideAccess: true,
  })
  console.log(`Created admin ${email}`)
}

for (const seedEmail of SEED_EMAILS) {
  if (seedEmail === email) continue
  const junk = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 5,
    overrideAccess: true,
    where: { email: { equals: seedEmail } },
  })
  for (const doc of junk.docs) {
    await payload.delete({ collection: 'users', id: doc.id, overrideAccess: true })
    console.log(`Removed seed user ${seedEmail}`)
  }
}

process.exit(0)
