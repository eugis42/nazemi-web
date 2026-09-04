/**
 * Shared admin meta for block picker (Payload `admin.images.thumbnail` + groups).
 */
import type { Block } from 'payload'

export type BlockThumbSlug =
  | 'hero'
  | 'events'
  | 'pillars'
  | 'news'
  | 'projects'
  | 'about'
  | 'pageIntro'
  | 'richText'
  | 'gallery'
  | 'speakers'
  | 'testimonials'
  | 'threeColumns'
  | 'threeCards'

const THUMB_BASE = '/block-thumbs'

export function blockPickerAdmin(options: {
  group: string
  thumb: BlockThumbSlug
  /** Accessible alt; defaults to thumb slug. */
  alt?: string
}): NonNullable<Block['admin']> {
  return {
    group: options.group,
    images: {
      thumbnail: {
        alt: options.alt || options.thumb,
        url: `${THUMB_BASE}/${options.thumb}.svg`,
      },
    },
  }
}

export const BLOCK_GROUP_HOME = 'Homepage'
export const BLOCK_GROUP_PAGE = 'Obsah stránky'
export const BLOCK_GROUP_WORKSHOP = 'Workshop'
