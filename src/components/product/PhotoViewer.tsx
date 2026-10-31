'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import type { GallerySlide } from '@/lib/product/gallery'
import { TopView } from './Measurements'

/**
 * The product's photos full screen (audit A2), on the native <dialog> (focus
 * kept inside, Escape closes, the page behind inert). No library: pointer
 * events and CSS transforms.
 *
 * Swipe or use the arrows for the next photo. Tap a photo to zoom in on that
 * spot and tap again to zoom out; pinch to zoom; drag to look around while
 * zoomed. Tapping is the one-finger way to every part of a photo (WCAG 2.5.7),
 * and the keyboard has the arrows and + and −.
 */

const MAX = 4
const TAP_ZOOM = 2.5

interface Zoom {
  s: number
  x: number
  y: number
}
const NONE: Zoom = { s: 1, x: 0, y: 0 }

export function PhotoViewer({
  slides,
  start,
  noun,
  onClose,
}: {
  slides: GallerySlide[]
  /** The photo to open on, or null while closed. */
  start: number | null
  noun: string
  /** With the photo the customer ended on. */
  onClose: (index: number) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const last = useRef(0)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (start !== null && !dialog.open) dialog.showModal()
    if (start === null && dialog.open) dialog.close()
  }, [start])

  return (
    <dialog ref={ref} aria-label="Photos, full screen" onClose={() => onClose(last.current)} className="hw-viewer">
      {start !== null && (
        <Viewer
          slides={slides}
          start={start}
          noun={noun}
          onIndex={(i) => {
            last.current = i
          }}
          onClose={() => ref.current?.close()}
        />
      )}
    </dialog>
  )
}

function Viewer({ slides, start, noun, onIndex, onClose }: { slides: GallerySlide[]; start: number; noun: string; onIndex: (i: number) => void; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const [zoom, setZoom] = useState<Zoom>(NONE)
  const [drag, setDrag] = useState(0)
  // Off while a finger moves the photo, on for taps, buttons and letting go.
  const [glide, setGlide] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ kind: 'swipe' | 'pan' | 'pinch'; x: number; y: number; zoom: Zoom; dist: number; moved: boolean } | null>(null)
  const count = slides.length
  const slide = slides[index]
  const zoomed = zoom.s > 1.01

  useEffect(() => {
    onIndex(index)
  }, [index, onIndex])

  const box = () => {
    const r = stage.current?.getBoundingClientRect()
    return { left: r?.left ?? 0, top: r?.top ?? 0, w: r?.width ?? 1, h: r?.height ?? 1 }
  }

  /** Keeps the (square) photo covering the screen where it can, centred where it can't. */
  const clamp = (z: Zoom): Zoom => {
    const { w, h } = box()
    const c = Math.min(w, h)
    const fit = (pos: number, span: number, offset: number) => {
      const size = c * z.s
      return size <= span ? (span - size) / 2 - offset * z.s : Math.min(-offset * z.s, Math.max(span - (offset + c) * z.s, pos))
    }
    const s = Math.min(MAX, Math.max(1, z.s))
    if (s <= 1.01) return NONE
    return { s, x: fit(z.x, w, (w - c) / 2), y: fit(z.y, h, (h - c) / 2) }
  }

  /** Zoom to s, keeping the point (px, py) on the stage where it is. */
  const zoomAt = (from: Zoom, s: number, px: number, py: number): Zoom =>
    clamp({ s, x: px - ((px - from.x) / from.s) * s, y: py - ((py - from.y) / from.s) * s })

  const show = (to: number) => {
    setGlide(true)
    setZoom(NONE)
    setIndex(Math.max(0, Math.min(count - 1, to)))
  }

  const tap = (px: number, py: number) => {
    setGlide(true)
    setZoom(zoomed ? NONE : zoomAt(NONE, TAP_ZOOM, px, py))
  }

  const step = (factor: number) => {
    const { w, h } = box()
    setGlide(true)
    setZoom((z) => zoomAt(z, z.s * factor, w / 2, h / 2))
  }

  const at = (e: ReactPointerEvent) => {
    const { left, top } = box()
    return { x: e.clientX - left, y: e.clientY - top }
  }
  const spread = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? { dist: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null
  }

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(e)
    pointers.current.set(e.pointerId, p)
    setGlide(false)
    if (pointers.current.size === 1) gesture.current = { kind: zoomed ? 'pan' : 'swipe', x: p.x, y: p.y, zoom, dist: 0, moved: false }
    const two = spread()
    if (two) {
      setDrag(0)
      gesture.current = { kind: 'pinch', x: two.x, y: two.y, zoom, dist: two.dist, moved: true }
    }
  }

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || !pointers.current.has(e.pointerId)) return
    const p = at(e)
    pointers.current.set(e.pointerId, p)
    const dx = p.x - g.x
    const dy = p.y - g.y
    if (Math.hypot(dx, dy) > 8) g.moved = true
    // Past the first or last photo it gives a little, then stops.
    if (g.kind === 'swipe' && g.moved) setDrag((dx > 0 && index === 0) || (dx < 0 && index === count - 1) ? dx / 3 : dx)
    if (g.kind === 'pan' && g.moved) setZoom(clamp({ ...g.zoom, x: g.zoom.x + dx, y: g.zoom.y + dy }))
    if (g.kind === 'pinch') {
      // The spot first between the fingers stays between them, as they spread and move.
      const two = spread()
      if (two && g.dist > 0) {
        const s = Math.min(MAX, Math.max(1, (g.zoom.s * two.dist) / g.dist))
        setZoom(clamp({ s, x: two.x - ((g.x - g.zoom.x) / g.zoom.s) * s, y: two.y - ((g.y - g.zoom.y) / g.zoom.s) * s }))
      }
    }
  }

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const p = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)
    if (!g || !p) return
    if (g.kind === 'pinch') {
      // One finger still down: carry on looking around with it.
      const rest = [...pointers.current.values()][0]
      gesture.current = rest ? { kind: 'pan', x: rest.x, y: rest.y, zoom, dist: 0, moved: true } : null
      return
    }
    gesture.current = null
    setGlide(true)
    if (!g.moved && e.type === 'pointerup') return tap(p.x, p.y)
    if (g.kind === 'swipe') {
      const dx = p.x - g.x
      setDrag(0)
      if (Math.abs(dx) > box().w * 0.18) show(index + (dx < 0 ? 1 : -1))
    }
  }

  const key = (e: ReactKeyboardEvent) => {
    const { w, h } = box()
    const nudge = (x: number, y: number) => {
      setGlide(true)
      setZoom((z) => clamp({ ...z, x: z.x + x, y: z.y + y }))
    }
    if (e.key === 'ArrowLeft') {
      if (zoomed) nudge(w * 0.15, 0)
      else show(index - 1)
    } else if (e.key === 'ArrowRight') {
      if (zoomed) nudge(-w * 0.15, 0)
      else show(index + 1)
    } else if (e.key === 'ArrowUp' && zoomed) nudge(0, h * 0.15)
    else if (e.key === 'ArrowDown' && zoomed) nudge(0, -h * 0.15)
    else if (e.key === '+' || e.key === '=') step(1.5)
    else if (e.key === '-') step(1 / 1.5)
    else return
    e.preventDefault()
  }

  return (
    // The keys work wherever focus is inside the viewer.
    <div className="flex h-full flex-col text-white" onKeyDown={key}>
      <div className="flex items-center justify-between gap-3 px-3 pt-[max(8px,env(safe-area-inset-top))]">
        <p className="px-2 text-[15px] font-semibold tabular-nums" aria-hidden="true">
          {index + 1} / {count}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" autoFocus className="flex size-12 items-center justify-center rounded-full hover:bg-white/10">
          <XIcon aria-hidden="true" size={26} />
        </button>
      </div>

      <div
        ref={stage}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={cn('relative min-h-0 flex-1 touch-none select-none overflow-hidden', zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
      >
        <div
          className={cn('flex h-full', glide && 'transition-transform duration-300 ease-out motion-reduce:transition-none')}
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
        >
          {slides.map((s, i) => (
            <div key={s.kind === 'photo' ? s.src : 'plan'} className="relative h-full w-full shrink-0 overflow-hidden" aria-hidden={i !== index}>
              <div
                className={cn('absolute inset-0 origin-top-left', glide && 'transition-transform duration-300 ease-out motion-reduce:transition-none')}
                style={i === index ? { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})` } : undefined}
              >
                {Math.abs(i - index) <= 1 &&
                  (s.kind === 'photo' ? (
                    <Image src={s.src} alt={s.alt} fill sizes="100vw" draggable={false} className="object-contain" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="flex aspect-square w-full max-w-[min(100%,calc(100svh-200px))] flex-col items-center justify-center gap-3 rounded-[14px] bg-stone p-5 text-ink">
                        <TopView layout={s.layout} noun={noun} className="block w-full" />
                        {s.note && <span className="text-[16px] font-semibold">{s.note}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => show(index - 1)}
          disabled={index === 0}
          aria-label="Previous photo"
          className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30"
        >
          <CaretLeftIcon aria-hidden="true" size={24} weight="bold" />
        </button>
        <p aria-live="polite" className="min-w-0 flex-1 text-center text-[15px] leading-snug text-gold-pale">
          <span className="sr-only">
            Photo {index + 1} of {count}:{' '}
          </span>
          {slide?.caption ?? (slide?.kind === 'photo' ? slide.alt : '')}
        </p>
        <button
          type="button"
          onClick={() => {
            if (!zoomed) return step(TAP_ZOOM)
            setGlide(true)
            setZoom(NONE)
          }}
          aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
        >
          {zoomed ? <MagnifyingGlassMinusIcon aria-hidden="true" size={24} /> : <MagnifyingGlassPlusIcon aria-hidden="true" size={24} />}
        </button>
        <button
          type="button"
          onClick={() => show(index + 1)}
          disabled={index === count - 1}
          aria-label="Next photo"
          className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30"
        >
          <CaretRightIcon aria-hidden="true" size={24} weight="bold" />
        </button>
      </div>
    </div>
  )
}
