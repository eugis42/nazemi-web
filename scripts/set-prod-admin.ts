import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const email = process.env.PROD_ADMIN_EMAIL || 'eugen.korda@me.com'
const password = process.env.PROD_ADMIN_PASSWORD
const name = process.env.PROD_ADMIN_NAME || 'Eugen Korda'

if (!password || password.length < 12) {
  console.error('Set PROD_ADMIN_PASSWORD (min 12 chars) in env.')
  process.exit(1)
}

const payload = await getPayload({ config })

const existing = await payload.find({
  collection: 'users',
  depth: 0,
  limit: 5,
  overrideAccess: true,
  where: {
    or: [{ email: { equals: email } }, { email: { equals: 'admin@nazemi.local' } }],
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

process.exit(0)
