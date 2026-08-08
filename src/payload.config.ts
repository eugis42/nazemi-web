import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchPlugin } from '@payloadcms/plugin-search'
import { cs } from '@payloadcms/translations/languages/cs'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Aktuality } from './collections/Aktuality'
import { Kalendar } from './collections/Kalendar'
import { Lide } from './collections/Lide'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Projekty } from './collections/Projekty'
import { Publikace } from './collections/Publikace'
import { Sites } from './collections/Sites'
import { Stranky } from './collections/Stranky'
import {
  PublicationTypes,
  Tags,
  WorkshopAudiences,
} from './collections/Tags'
import { Workshopy } from './collections/Workshopy'
import { searchBeforeSync } from './search/beforeSync'
import { searchExtraFields } from './search/fields'
import { searchDefaultPriorities } from './search/priorities'
import { ADMIN_NAV_SHARED_SETTINGS } from './lib/admin-nav-groups'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // Public URL in production (cookies / absolute URLs). Local: leave unset.
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || undefined,
  admin: {
    dateFormat: 'd. M. yyyy, HH:mm',
    user: Users.slug,
    components: {
      beforeNav: ['/components/admin/SiteContextNav#SiteContextNav'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Stranky,
    Aktuality,
    Kalendar,
    Projekty,
    Workshopy,
    Publikace,
    Lide,
    Tags,
    WorkshopAudiences,
    PublicationTypes,
    Sites,
    Users,
    Media,
  ],
  editor: lexicalEditor(),
  i18n: {
    fallbackLanguage: 'cs',
    supportedLanguages: {
      cs,
    },
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Default off: Drizzle "create vs rename" prompts hang Next.js (no TTY).
    // Run `npm run db:push` once after schema changes.
    push: process.env.PAYLOAD_DATABASE_PUSH === 'true',
  }),
  sharp,
  plugins: [
    searchPlugin({
      beforeSync: searchBeforeSync,
      collections: ['stranky', 'aktuality', 'kalendar', 'projekty', 'workshopy', 'publikace'],
      defaultPriorities: searchDefaultPriorities,
      deleteDrafts: true,
      searchOverrides: {
        admin: {
          group: ADMIN_NAV_SHARED_SETTINGS,
        },
        fields: ({ defaultFields }) => searchExtraFields(defaultFields),
        labels: {
          plural: 'Vyhledávání',
          singular: 'Výsledek vyhledávání',
        },
      },
      syncDrafts: false,
    }),
  ],
})
