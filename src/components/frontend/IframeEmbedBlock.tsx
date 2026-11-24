import {
  IFRAME_ALLOW,
  IFRAME_SANDBOX,
  resolveSafeIframeEmbed,
} from '@/lib/iframe-embed'
import { ScriptEmbedClient } from '@/components/frontend/ScriptEmbedClient'

export type IframeEmbedBlockData = {
  source?: string | null
  title?: string | null
  [key: string]: unknown
}

const DEFAULT_HEIGHT_PX = 400

/** Parse paste size → px number when possible (ignore % / vw). */
function sizeToPx(value: string | undefined): number | null {
  if (!value) return null
  const trimmed = value.trim()
  const bare = trimmed.match(/^(\d+(\.\d+)?)$/)
  if (bare) return Number(bare[1])
  const px = trimmed.match(/^(\d+(\.\d+)?)px$/i)
  if (px) return Number(px[1])
  return null
}

/**
 * Controlled embed — sandboxed iframe or allowlisted external script.
 * Never dangerouslySetInnerHTML on paste.
 */
export function IframeEmbedBlockView({ block }: { block: IframeEmbedBlockData }) {
  const embed = resolveSafeIframeEmbed(block.source)
  if (!embed) return null

  const title =
    (typeof block.title === 'string' && block.title.trim()) || 'Vložený obsah'

  if (embed.kind === 'script') {
    return <ScriptEmbedClient src={embed.src} title={title} />
  }

  const wPx = sizeToPx(embed.width)
  const hPx = sizeToPx(embed.height) ?? DEFAULT_HEIGHT_PX
  const aspectW = wPx && wPx > 0 ? wPx : 16
  const aspectH = wPx && wPx > 0 ? hPx : 9

  return (
    <div
      className="not-prose relative w-full max-w-full overflow-hidden"
      data-block="iframeEmbed"
      data-embed="iframe"
      style={{ aspectRatio: `${aspectW} / ${aspectH}` }}
    >
      <iframe
        allow={IFRAME_ALLOW}
        allowFullScreen
        className="absolute inset-0 size-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={IFRAME_SANDBOX}
        src={embed.src}
        title={title}
      />
    </div>
  )
}
