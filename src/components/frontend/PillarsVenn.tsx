import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { PillarsVennMotion } from '@/components/frontend/PillarsVennMotion'

let cachedSvg: string | null = null

async function readVennSvg() {
  if (cachedSvg !== null) return cachedSvg
  try {
    cachedSvg = await readFile(path.join(process.cwd(), 'public', 'pillars-venn.svg'), 'utf8')
  } catch {
    cachedSvg = ''
  }
  return cachedSvg
}

export async function PillarsVenn() {
  const svg = await readVennSvg()
  if (!svg) return null

  return (
    <PillarsVennMotion>
      <div className="pillars-venn-stage" dangerouslySetInnerHTML={{ __html: svg }} />
    </PillarsVennMotion>
  )
}
