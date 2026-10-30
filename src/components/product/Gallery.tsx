'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CaretLeftIcon, CaretRightIcon, ImageIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * Swipeable photos (native scroll snapping, so it moves with the finger and
 * needs no library). The first photo is the page's main image and loads first.
 *
 * Revision 4: the photos swipe inside a gold-rimmed alcove like the home
 * page's (globals.css .hw-alcove-flow), shown on velvet by the page, with the
 * colour on a plate at its foot and arch-topped thumbnails on desktops.
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
  // Photos after the first wait until the page has loaded (or the customer
  // swipes), so the main photo has the connection to itself.
  const [showRest, setShowRest] = useState(false)

  useEffect(() => {
    if (showRest) return
    const show = () => setShowRest(true)
    // Safari has no requestIdleCallback.
    const later = () => {
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(show, { timeout: 2000 })
      else setTimeout(show, 200)
    }
    if (document.readyState === 'complete') later()
    else window.addEventListener('load', later, { once: true })
    return () => window.removeEventListener('load', later)
  }, [showRest])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let frame = 0
    const onScroll = () => {
      setShowRest(true)
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
      <div className="hw-alcove hw-alcove-flow">
        <span aria-hidden="true" className="hw-alcove-glow" />
        <span aria-hidden="true" className="hw-alcove-rim" />
        {images.length === 0 ? (
          <div className="hw-alcove-scroll flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden bg-stone text-slate">
            <ImageIcon aria-hidden="true" size={40} />
            <span className="text-[15px]">Photo coming soon</span>
          </div>
        ) : (
          <ul ref={listRef} className="hw-alcove-scroll no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
            {images.map((img, i) => (
              <li
                key={img.src}
                className="relative aspect-square w-full shrink-0 snap-center bg-alcove"
                aria-label={images.length > 1 ? `Photo ${i + 1} of ${images.length}` : undefined}
              >
                {(i === 0 || showRest) && (
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    priority={priority && i === 0}
                    fetchPriority={priority && i === 0 ? 'high' : undefined}
                    sizes="(min-width: 1200px) 540px, (min-width: 1024px) 45vw, calc(100vw - 32px)"
                    className="object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <span aria-hidden="true" className="hw-alcove-line" />

        {overlay}

        {caption && <span className="hw-plate pointer-events-none truncate text-[14px] font-semibold leading-tight text-gold-pale">{caption}</span>}

        {/*
          Phones: the dots sit on the photo's floor, just above the plate, so a piece with several photos
          takes no more height than one with a single photo (audit A1). They're buttons too (24px targets),
          so every photo is one tap away without swiping.
        */}
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-[26px] z-[2] flex justify-center lg:hidden">
            <div className="flex rounded-full bg-[rgb(26_3_8/0.5)] px-1">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  aria-label={`Photo ${i + 1} of ${images.length}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => {
                    setShowRest(true)
                    go(i)
                  }}
                  className="flex h-6 min-w-6 items-center justify-center px-[3px]"
                >
                  <span className={cn('h-1.5 rounded-full transition-[width] duration-200', i === index ? 'w-5 bg-gold-pale' : 'w-1.5 bg-white/60')} />
                </button>
              ))}
            </div>
          </div>
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
              onClick={() => {
                setShowRest(true)
                go(Math.min(images.length - 1, index + 1))
              }}
              disabled={index === images.length - 1}
              className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm disabled:opacity-0 lg:flex"
            >
              <CaretRightIcon aria-hidden="true" size={20} weight="bold" />
            </button>
          </>
        )}
      </div>

      {/* Desktops: every photo as a thumbnail, loaded once the main photo has had the connection to itself. */}
      {images.length > 1 && (
        <ul className="hidden gap-3 pt-9 lg:flex lg:flex-wrap lg:justify-center" aria-label="Choose a photo">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                aria-label={`Photo ${i + 1} of ${images.length}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => {
                  setShowRest(true)
                  go(i)
                }}
                className={cn(
                  'hw-niche hw-niche-square w-[72px] bg-alcove',
                  i === index ? 'ring-2 ring-gold-pale ring-offset-2 ring-offset-wine' : 'opacity-75 hover:opacity-100',
                )}
              >
                {(i === 0 || showRest) && <Image src={img.src} alt="" width={72} height={72} className="size-full object-cover" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
