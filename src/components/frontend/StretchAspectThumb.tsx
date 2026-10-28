'use client'

import { useLayoutEffect, useRef, type CSSProperties } from 'react'

const ASPECT_PRESETS: Record<'landscape' | 'square' | 'portrait', number> = {
  landscape: 16 / 9,
  square: 1,
  portrait: 2 / 3,
}

/**
 * Side thumb: height matches Body sibling; width = height × aspect ratio.
 * ResizeObserver — CSS flex/grid cannot reliably do height→width aspect transfer here.
 * Initial aspect-ratio + self-stretch ≈ final box (avoids w-36 → wide CLS).
 */
export function StretchAspectThumb({
  alt,
  aspect = 'portrait',
  aspectRatio,
  objectFit = 'cover',
  src,
  style,
}: {
  alt: string
  /** Stacked layout inside Sloupce — CSS aspect. */
  aspect?: 'landscape' | 'square' | 'portrait'
  /** Width / height. Omit → image intrinsic ratio (fallback 2/3). */
  aspectRatio?: number
  objectFit?: 'cover' | 'contain'
  src: string
  style?: CSSProperties
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const cssRatio =
    aspectRatio && aspectRatio > 0 ? aspectRatio : ASPECT_PRESETS[aspect]

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    // Sloupce: CSS stacks the card — don’t force side-rail pixel width.
    if (wrap.closest('[data-component="column"], [data-component="column-card"]')) {
      wrap.style.height = ''
      wrap.style.width = ''
      return
    }

    // Frame: [absolute link?][thumb][Body] — measure Body only (stable, no feedback loop).
    const body = wrap.nextElementSibling as HTMLElement | null
    if (!body) return

    const sync = () => {
      const h = body.getBoundingClientRect().height
      if (h <= 0) return

      let ratio = aspectRatio
      if (ratio == null || ratio <= 0) {
        const img = imgRef.current
        ratio =
          img && img.naturalWidth > 0 && img.naturalHeight > 0
            ? img.naturalWidth / img.naturalHeight
            : ASPECT_PRESETS.portrait
      }

      wrap.style.height = `${h}px`
      wrap.style.width = `${h * ratio}px`
    }

    const ro = new ResizeObserver(sync)
    ro.observe(body)

    const img = imgRef.current
    if (img) {
      if (img.complete) sync()
      else img.addEventListener('load', sync)
    } else {
      sync()
    }

    return () => {
      ro.disconnect()
      img?.removeEventListener('load', sync)
    }
  }, [aspectRatio, src])

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none relative z-[1] h-full shrink-0 self-stretch overflow-hidden"
      data-embed-aspect={aspect}
      data-embed-media
      style={{ aspectRatio: String(cssRatio) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        alt={alt}
        className={
          objectFit === 'cover'
            ? 'absolute inset-0 size-full object-cover'
            : 'absolute inset-0 size-full object-contain object-left'
        }
        loading="lazy"
        src={src}
        style={style}
      />
    </div>
  )
}
