import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'

import type { Media } from '@/payload-types'

import type { WpAttachment } from './parse-wxr'

export const CACHE_DIR = path.resolve(process.cwd(), '.cache/wp-import')
export const BIG_COVER_MIN_WIDTH = 1400
export const BIG_COVER_MIN_HEIGHT = 700

const EXT_MIME: Record<string, string> = {
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
}

const IMAGE_EXT = new Set(['.gif', '.heic', '.heif', '.jpeg', '.jpg', '.png', '.webp'])

export const coverLayout = (width: number | null, height: number | null): 'big' | 'small' =>
  width != null && height != null && width >= BIG_COVER_MIN_WIDTH && height >= BIG_COVER_MIN_HEIGHT
    ? 'big'
    : 'small'

export const mimeFromName = (filename: string) => {
  const ext = path.extname(filename).toLowerCase()
  return EXT_MIME[ext] || 'application/octet-stream'
}

export const isImageFilename = (filename: string) => IMAGE_EXT.has(path.extname(filename).toLowerCase())

export const assertHeifSupport = () => {
  const heif = sharp.format.heif
  if (!heif?.input) {
    console.warn('sharp cannot decode HEIF/HEIC — HEIC originals that fail size gen will be skipped.')
    return false
  }
  return true
}

const safeBasename = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'file'

const urlHash = (url: string) => createHash('sha1').update(url).digest('hex').slice(0, 12)

export const storedFilename = (opts: { attachmentId?: string; url: string; basename: string }) => {
  const base = safeBasename(decodeURIComponent(opts.basename))
  if (opts.attachmentId) return `wp-${opts.attachmentId}-${base}`
  return `wp-url-${urlHash(opts.url)}-${base}`
}

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true })
}

export type FetchResult =
  | { ok: true; filePath: string }
  | { ok: false; reason: string }

const guessExt = (url: string, contentType: string | null) => {
  const fromUrl = path.extname(new URL(url).pathname).toLowerCase()
  if (fromUrl && fromUrl !== '.') return fromUrl
  if (contentType?.includes('pdf')) return '.pdf'
  if (contentType?.includes('jpeg')) return '.jpg'
  if (contentType?.includes('png')) return '.png'
  if (contentType?.includes('webp')) return '.webp'
  if (contentType?.includes('heic') || contentType?.includes('heif')) return '.heic'
  if (contentType?.includes('zip')) return '.zip'
  return ''
}

export const downloadToCache = async (
  url: string,
  pdfDir?: string,
): Promise<FetchResult> => {
  ensureDir(CACHE_DIR)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: `bad url ${url}` }
  }

  const basename = decodeURIComponent(path.basename(parsed.pathname)) || 'file'
  const cacheName = `${urlHash(url)}-${safeBasename(basename)}`
  const cachePath = path.join(CACHE_DIR, cacheName)
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 0) {
    return { ok: true, filePath: cachePath }
  }

  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'nazemi-aktuality-import/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(45_000),
    })
    if (res.ok) {
      const type = res.headers.get('content-type') || ''
      if (!type.includes('text/html')) {
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length > 0) {
          const ext = path.extname(cachePath) || guessExt(url, type)
          const finalPath = ext && !cachePath.endsWith(ext) ? `${cachePath}${ext}` : cachePath
          fs.writeFileSync(finalPath, buf)
          return { ok: true, filePath: finalPath }
        }
      }
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    if (!pdfDir) return { ok: false, reason }
  }

  if (pdfDir && basename.toLowerCase().endsWith('.pdf')) {
    const local = path.join(pdfDir, basename)
    if (fs.existsSync(local)) {
      const dest = path.join(CACHE_DIR, `local-${safeBasename(basename)}`)
      fs.copyFileSync(local, dest)
      return { ok: true, filePath: dest }
    }
  }

  return { ok: false, reason: `fetch failed ${url}` }
}

export const imageSize = async (filePath: string) => {
  try {
    const meta = await sharp(filePath).metadata()
    return {
      height: meta.height ?? null,
      width: meta.width ?? null,
    }
  } catch {
    return { height: null, width: null }
  }
}

export type UploadedAsset = {
  height: number | null
  id: number | string
  mimeType: string | null
  url: string | null
  width: number | null
}

const findExisting = async (payload: Payload, filename: string) => {
  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { filename: { equals: filename } },
  })
  return result.docs[0] ?? null
}

export const upsertMediaFile = async ({
  alt,
  caption,
  filePath,
  filename,
  payload,
}: {
  alt: string
  caption?: string
  filePath: string
  filename: string
  payload: Payload
}): Promise<UploadedAsset | null> => {
  const existing = await findExisting(payload, filename)
  if (existing) {
    return {
      height: existing.height ?? null,
      id: existing.id,
      mimeType: existing.mimeType ?? null,
      url: existing.url ?? null,
      width: existing.width ?? null,
    }
  }

  const destDir = path.resolve(process.cwd(), 'media')
  ensureDir(destDir)
  const uploadPath = path.join(CACHE_DIR, 'named', filename)
  ensureDir(path.dirname(uploadPath))
  if (!fs.existsSync(uploadPath)) fs.copyFileSync(filePath, uploadPath)

  const mimeType = mimeFromName(filename)
  try {
    const doc = (await payload.create({
      collection: 'media',
      data: {
        alt: alt || filename.replace(/\.[^.]+$/, ''),
        ...(caption ? { caption } : {}),
      },
      file: {
        data: fs.readFileSync(uploadPath),
        mimetype: mimeType,
        name: filename,
        size: fs.statSync(uploadPath).size,
      },
      overrideAccess: true,
    })) as Media

    return {
      height: doc.height ?? null,
      id: doc.id,
      mimeType: doc.mimeType ?? null,
      url: doc.url ?? null,
      width: doc.width ?? null,
    }
  } catch (err) {
    payload.logger.error({ err, msg: `Media create failed ${filename}` })
    return null
  }
}

export const uploadAttachment = async ({
  attachment,
  caption,
  payload,
  pdfDir,
}: {
  attachment: WpAttachment
  caption?: string
  payload: Payload
  pdfDir?: string
}): Promise<UploadedAsset | null> => {
  const basename = path.basename(attachment.file || attachment.url) || `att-${attachment.id}`
  const filename = storedFilename({
    attachmentId: attachment.id,
    basename,
    url: attachment.url,
  })
  const fetched = await downloadToCache(attachment.url, pdfDir)
  if (!fetched.ok) {
    payload.logger.error({ msg: fetched.reason })
    return null
  }
  return upsertMediaFile({
    alt: attachment.alt || attachment.title || basename,
    caption,
    filePath: fetched.filePath,
    filename,
    payload,
  })
}

export const uploadRemoteFile = async ({
  alt,
  caption,
  payload,
  pdfDir,
  url,
}: {
  alt?: string
  caption?: string
  payload: Payload
  pdfDir?: string
  url: string
}): Promise<UploadedAsset | null> => {
  let basename = 'file'
  try {
    basename = decodeURIComponent(path.basename(new URL(url).pathname)) || 'file'
  } catch {
    /* keep file */
  }
  const filename = storedFilename({ basename, url })
  const fetched = await downloadToCache(url, pdfDir)
  if (!fetched.ok) {
    payload.logger.error({ msg: fetched.reason })
    return null
  }
  return upsertMediaFile({
    alt: alt || basename.replace(/\.[^.]+$/, ''),
    caption,
    filePath: fetched.filePath,
    filename,
    payload,
  })
}

export const originalImageUrl = (url: string) =>
  url.replace(/-\d+x\d+(?=\.(?:jpe?g|png|gif|webp|heic|heif)$)/i, '')
