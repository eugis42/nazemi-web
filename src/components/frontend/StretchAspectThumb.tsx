'use client'

import { useLayoutEffect, useRef, type CSSProperties } from 'react'

/**
 * Side thumb: height matches Body sibling; width = height × aspect ratio.
 * ResizeObserver — CSS flex/grid cannot reliably do height→width aspect transfer here.
 */
export function StretchAspectThumb({
  alt,
  aspectRatio,
  objectFit = 'cover',
  src,
  style,
}: {
  alt: string
  /** Width / height. Omit → image intrinsic ratio (fallback 2/3). */
  aspectRatio?: number
  objectFit?: 'cover' | 'contain'
  src: string
  style?: CSSProperties
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

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
            : 2 / 3
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
      className="pointer-events-none relative z-[1] w-36 shrink-0 self-stretch overflow-hidden"
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
