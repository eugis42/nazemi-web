import {
  IFRAME_ALLOW,
  IFRAME_SANDBOX,
  resolveSafeIframeSrc,
} from '@/lib/iframe-embed'

export type IframeEmbedBlockData = {
  aspect?: string | null
  source?: string | null
  title?: string | null
  [key: string]: unknown
}

const ASPECT_CLASS: Record<string, string> = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
  '21/9': 'aspect-[21/9]',
}

/**
 * Controlled sandboxed iframe — never dangerouslySetInnerHTML on paste.
 */
export function IframeEmbedBlockView({ block }: { block: IframeEmbedBlockData }) {
  const src = resolveSafeIframeSrc(block.source)
  if (!src) return null

  const title =
    (typeof block.title === 'string' && block.title.trim()) || 'Vložený obsah'
  const aspectKey = typeof block.aspect === 'string' ? block.aspect : '16/9'
  const aspectClass = ASPECT_CLASS[aspectKey] || ASPECT_CLASS['16/9']

  return (
    <div
      className={`not-prose relative w-full max-w-full overflow-hidden bg-ground/5 ${aspectClass}`}
      data-block="iframeEmbed"
    >
      <iframe
        allow={IFRAME_ALLOW}
        allowFullScreen
        className="absolute inset-0 size-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={IFRAME_SANDBOX}
        src={src}
        title={title}
      />
    </div>
  )
}
