import type { CollectionConfig } from 'payload'
import path from 'path'

import { mediaAccess } from '@/access/roles'
import { ADMIN_NAV_MEDIA } from '@/lib/admin-nav-groups'

/** Shared WebP encode — visually near-lossless, much smaller than JPEG/PNG. */
const webp = (quality: number) =>
  ({
    format: 'webp' as const,
    options: { quality },
  }) as const

/**
 * Image sizes derived from FE templates:
 * - thumb     — admin + lecturer avatars (~80px display)
 * - square    — event cards (aspect-square)
 * - card      — landscape listing cards / news heroes (~16:9)
 * - landscape — workshop cards (aspect-4/3)
 * - portrait  — publication covers (aspect-2/3)
 * - hero      — page headers, event overview, homepage backdrop
 * - large     — full-frame (gallery / lightbox): max 2400×2400, no crop
 *
 * Cropped sizes use `fit: 'cover'` + admin focal point.
 * `large` uses `fit: 'inside'` so the whole image stays visible.
 */
export const mediaImageSizes = [
  {
    name: 'thumb',
    width: 400,
    height: 400,
    fit: 'cover' as const,
    position: 'centre',
    formatOptions: webp(78),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
  {
    name: 'square',
    width: 900,
    height: 900,
    fit: 'cover' as const,
    position: 'centre',
    formatOptions: webp(80),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
  {
    name: 'card',
    width: 1365,
    height: 768,
    fit: 'cover' as const,
    position: 'centre',
    formatOptions: webp(80),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
  {
    name: 'landscape',
    width: 1200,
    height: 900,
    fit: 'cover' as const,
    position: 'centre',
    formatOptions: webp(80),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
  {
    name: 'portrait',
    width: 800,
    height: 1200,
    fit: 'cover' as const,
    position: 'centre',
    formatOptions: webp(80),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
  {
    name: 'hero',
    width: 1920,
    height: 1080,
    fit: 'cover' as const,
    position: 'centre',
    formatOptions: webp(82),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
  {
    name: 'large',
    width: 2400,
    height: 2400,
    /** Contain within box — no crop; use when the full frame is needed. */
    fit: 'inside' as const,
    withoutEnlargement: true,
    formatOptions: webp(82),
    admin: { disableListColumn: true, disableListFilter: true, disableGroupBy: true },
  },
]

export const Media: CollectionConfig = {
  slug: 'media',
  access: mediaAccess,
  admin: {
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    group: ADMIN_NAV_MEDIA,
    useAsTitle: 'alt',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alternativní text',
      required: true,
      admin: {
        description: 'Popis obrázku pro přístupnost a SEO.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Popisek',
      admin: {
        description: 'Volitelný popisek u obrázku v obsahu.',
      },
    },
  ],
  labels: {
    plural: 'Knihovna médií',
    singular: 'Médium',
  },
  upload: {
    // cwd/media — gitignored; Docker bind/volume on VPS (docker-compose.prod.yml).
    staticDir: path.resolve(process.cwd(), 'media'),
    /** Admin list / relationship previews. */
    adminThumbnail: 'thumb',
    /** Focal point UI — used by cover/crop sizes; changing it re-saves sizes. */
    focalPoint: true,
    crop: true,
    mimeTypes: ['image/*'],
    imageSizes: mediaImageSizes,
  },
}
