import {
  IFRAME_ALLOW,
  IFRAME_SANDBOX,
  resolveSafeIframeEmbed,
} from '@/lib/iframe-embed'

export type IframeEmbedBlockData = {
  source?: string | null
  title?: string | null
  [key: string]: unknown
}

const DEFAULT_HEIGHT = '400'

/**
 * Controlled sandboxed iframe — never dangerouslySetInnerHTML on paste.
 * Inline sizing from paste width/height; no forced aspect box.
 */
export function IframeEmbedBlockView({ block }: { block: IframeEmbedBlockData }) {
  const embed = resolveSafeIframeEmbed(block.source)
  if (!embed) return null

  const title =
    (typeof block.title === 'string' && block.title.trim()) || 'Vložený obsah'

  return (
    <iframe
      allow={IFRAME_ALLOW}
      allowFullScreen
      className="not-prose max-w-full border-0 align-middle"
      data-block="iframeEmbed"
      height={embed.height ?? DEFAULT_HEIGHT}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox={IFRAME_SANDBOX}
      src={embed.src}
      title={title}
      width={embed.width ?? '100%'}
    />
  )
}
