/**
 * Generates 3:2 block-picker thumbs from official Tabler outline icons.
 * Run: pnpm exec tsx scripts/generate-block-thumbs.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(dirname, '../public/block-thumbs')
const outlineDir = path.resolve(dirname, '../node_modules/@tabler/icons/icons/outline')

/** block thumb slug → Tabler outline icon filename (no .svg) */
const thumbs: { slug: string; icon: string }[] = [
  { slug: 'hero', icon: 'layout-navbar' },
  { slug: 'events', icon: 'calendar-event' },
  { slug: 'pillars', icon: 'circles-relation' },
  { slug: 'news', icon: 'news' },
  { slug: 'projects', icon: 'folder' },
  { slug: 'about', icon: 'users' },
  { slug: 'pageIntro', icon: 'section' },
  { slug: 'richText', icon: 'file-text' },
  { slug: 'gallery', icon: 'photo' },
  { slug: 'speakers', icon: 'microphone' },
  { slug: 'testimonials', icon: 'quote' },
  { slug: 'threeColumns', icon: 'columns-3' },
  { slug: 'threeCards', icon: 'layout-cards' },
]

function iconInner(iconName: string): string {
  const raw = readFileSync(path.join(outlineDir, `${iconName}.svg`), 'utf8')
  const match = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  if (!match) throw new Error(`Bad Tabler SVG: ${iconName}`)
  return match[1]
    .replace(/\sstroke="currentColor"/g, ' stroke="#333538"')
    .replace(/\sclass="[^"]*"/g, '')
    .trim()
}

function svgFor(iconName: string): string {
  const inner = iconInner(iconName)
  const scale = 5
  const size = 24 * scale
  const x = (480 - size) / 2
  const y = (320 - size) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320" fill="none">
  <rect width="480" height="320" fill="#F1F2F4"/>
  <g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="#333538" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    ${inner}
  </g>
</svg>
`
}

for (const thumb of thumbs) {
  const file = path.join(outDir, `${thumb.slug}.svg`)
  writeFileSync(file, svgFor(thumb.icon), 'utf8')
  console.log('wrote', path.relative(process.cwd(), file), `← ${thumb.icon}`)
}
