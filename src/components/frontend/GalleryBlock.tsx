'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Lightbox, { type SlideImage } from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

import type { GalleryImage } from '@/lib/gallery'

export type { GalleryImage }

type GalleryBlockProps = {
  images: GalleryImage[]
  columns?: '1' | '2' | '3' | null
  caption?: string | null
}

const MASONRY_COLS: Record<'1' | '2' | '3', string> = {
  '1': 'lg:columns-1',
  '2': 'lg:columns-2',
  '3': 'lg:columns-3',
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function GalleryBlock({ images: rawImages, columns, caption }: GalleryBlockProps) {
  const images = useMemo(
    () => rawImages.filter((img): img is GalleryImage => Boolean(img?.url)),
    [rawImages],
  )
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const reducedMotion = usePrefersReducedMotion()
  const colKey = columns === '1' || columns === '3' ? columns : '2'

  const slides: SlideImage[] = useMemo(
    () =>
      images.map((img) => ({
        src: img.fullUrl || img.url,
        alt: img.alt || '',
      })),
    [images],
  )

  const openAt = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  if (!images.length) return null

  if (images.length === 1) {
    const image = images[0]
    return (
      <figure className="w-full" data-block="gallery" data-count="1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={image.alt || ''} className="h-auto w-full" src={image.url} />
        {caption ? (
          <figcaption className="font-inter mt-3 text-[14px] leading-snug text-ground">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  return (
    <figure className="w-full" data-block="gallery" data-count={images.length}>
      {/* Desktop masonry */}
      <ul className={`hidden gap-grid lg:block ${MASONRY_COLS[colKey]}`} role="list">
        {images.map((image, index) => (
          <li className="mb-grid break-inside-avoid" key={`${image.url}-${index}`}>
            <button
              className="group relative block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground"
              onClick={() => openAt(index)}
              type="button"
              aria-label={`Zvětšit: ${image.alt || `Obrázek ${index + 1}`}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={image.alt || ''}
                className="h-auto w-full transition-opacity duration-150 group-hover:opacity-90"
                src={image.url}
              />
            </button>
          </li>
        ))}
      </ul>

      {/* Mobile peek carousel */}
      <div className="lg:hidden">
        <GalleryCarousel
          images={images}
          onSelect={openAt}
          reducedMotion={reducedMotion}
        />
      </div>

      {caption ? (
        <figcaption className="font-inter mt-3 px-card text-[14px] leading-snug text-ground lg:px-0">
          {caption}
        </figcaption>
      ) : null}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex < 0 ? 0 : lightboxIndex}
        slides={slides}
        animation={{
          fade: reducedMotion ? 0 : 350,
          swipe: reducedMotion ? 0 : 250,
          navigation: reducedMotion ? 0 : 250,
        }}
        controller={{ closeOnBackdropClick: true }}
        carousel={{ finite: images.length <= 1, preload: 2 }}
        className="nazemi-lightbox"
      />
    </figure>
  )
}

function GalleryCarousel({
  images,
  onSelect,
  reducedMotion,
}: {
  images: GalleryImage[]
  onSelect: (index: number) => void
  reducedMotion: boolean
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    loop: images.length > 2,
    skipSnaps: false,
    duration: reducedMotion ? 0 : 25,
  })
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelectSlide = () => setSelected(emblaApi.selectedScrollSnap())
    onSelectSlide()
    emblaApi.on('select', onSelectSlide)
    emblaApi.on('reInit', onSelectSlide)
    return () => {
      emblaApi.off('select', onSelectSlide)
      emblaApi.off('reInit', onSelectSlide)
    }
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  return (
    <div className="w-screen max-w-[100vw] ml-[calc(50%-50vw)]" data-component="gallery-carousel">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y items-center">
          {images.map((image, index) => (
            <div
              className="min-w-0 shrink-0 grow-0 basis-[82%] px-1.5"
              key={`${image.url}-${index}`}
            >
              <button
                className="block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground"
                onClick={() => onSelect(index)}
                type="button"
                aria-label={`Zvětšit: ${image.alt || `Obrázek ${index + 1}`}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={image.alt || ''}
                  className="h-auto w-full"
                  draggable={false}
                  src={image.url}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        aria-label="Galerie — stránkování"
        className="mt-4 flex items-center justify-center gap-2"
        role="tablist"
      >
        {images.map((image, index) => (
          <button
            aria-label={`Obrázek ${index + 1} z ${images.length}`}
            aria-selected={selected === index}
            className={`size-2 rounded-full border border-ground transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ground ${
              selected === index ? 'bg-ground' : 'bg-transparent'
            }`}
            key={`dot-${image.url}-${index}`}
            onClick={() => scrollTo(index)}
            role="tab"
            type="button"
          />
        ))}
      </div>
    </div>
  )
}
