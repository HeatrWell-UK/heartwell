'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CaretLeftIcon, CaretRightIcon, ImageIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * Swipeable photos (native scroll snapping, so it moves with the finger and
 * needs no library). The first photo is the page's main image and loads first.
 */
export function Gallery({
  images,
  caption,
  overlay,
  priority,
}: {
  images: { src: string; alt: string }[]
  caption: string | null
  overlay?: ReactNode
  priority: boolean
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setIndex(Math.round(list.scrollLeft / Math.max(1, list.clientWidth))))
    }
    list.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      list.removeEventListener('scroll', onScroll)
    }
  }, [])

  const go = (to: number) => {
    const list = listRef.current
    if (list) list.scrollTo({ left: to * list.clientWidth, behavior: 'smooth' })
  }

  return (
    <section aria-label="Photos" className="relative">
      <div className="relative">
        {images.length === 0 ? (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-stone text-slate lg:rounded-[var(--radius-panel)]">
            <ImageIcon aria-hidden="true" size={40} />
            <span className="text-[15px]">Photo coming soon</span>
          </div>
        ) : (
          <ul ref={listRef} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:rounded-[var(--radius-panel)]">
            {images.map((img, i) => (
              <li
                key={img.src}
                className="relative aspect-square w-full shrink-0 snap-center bg-stone"
                aria-label={images.length > 1 ? `Photo ${i + 1} of ${images.length}` : undefined}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  priority={priority && i === 0}
                  fetchPriority={priority && i === 0 ? 'high' : undefined}
                  sizes="(min-width: 1200px) 620px, (min-width: 1024px) 52vw, 100vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        )}

        {overlay}

        {caption && (
          <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate rounded-full bg-wine-deep/85 px-3 py-1 text-[13px] font-semibold text-white">
            {caption}
          </span>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(Math.max(0, index - 1))}
              disabled={index === 0}
              className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm disabled:opacity-0 lg:flex"
            >
              <CaretLeftIcon aria-hidden="true" size={20} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(Math.min(images.length - 1, index + 1))}
              disabled={index === images.length - 1}
              className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm disabled:opacity-0 lg:flex"
            >
              <CaretRightIcon aria-hidden="true" size={20} weight="bold" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div aria-hidden="true" className="flex justify-center gap-1.5 pt-3">
          {images.map((img, i) => (
            <span key={img.src} className={cn('h-1.5 rounded-full transition-[width] duration-200', i === index ? 'w-5 bg-velvet' : 'w-1.5 bg-[#DCCFD0]')} />
          ))}
        </div>
      )}
    </section>
  )
}
