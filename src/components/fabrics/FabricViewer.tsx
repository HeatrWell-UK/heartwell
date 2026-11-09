'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CaretLeftIcon, CaretRightIcon, XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * One fabric, large (owner, 10 November 2026): a tap on any fabric opens it
 * here, with the page's own choice under it ("Choose this for my samples",
 * "Build mine in this"). A bottom sheet on phones, a centred panel from
 * tablets up, on the native <dialog> like Sheet.
 *
 * Swipe sideways or use the arrows for the next fabric. Tap the fabric to look
 * closer at that spot and tap again to step back: one finger reaches every
 * part of it (WCAG 2.5.7), and the keyboard has the arrow keys and Enter.
 */

export interface ViewedFabric {
  id: string
  code: string
  name: string
  hex: string | null
  image: string | null
  collection: string
}

const ZOOM = 2.6
const SWIPE = 45

export function FabricViewer<F extends ViewedFabric>({
  fabrics,
  index,
  onIndex,
  onClose,
  detail,
  children,
}: {
  fabrics: F[]
  /** The fabric on show, or null while closed. */
  index: number | null
  onIndex: (index: number) => void
  onClose: () => void
  /** A line under the name, e.g. a collection's extra charge. */
  detail?: (fabric: F) => ReactNode
  /** The page's buttons for the fabric on show. */
  children: (fabric: F) => ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const open = index !== null
  const fabric = open ? fabrics[index] : undefined

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const count = fabrics.length
  const step = (by: number) => {
    if (index === null || count < 2) return
    onIndex((index + by + count) % count)
  }

  return (
    <dialog
      ref={ref}
      aria-label={fabric ? `${fabric.name}, ${fabric.collection}` : 'Fabric'}
      // React passes a nested dialog's close event up to its parents, so only this dialog's own counts.
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') step(-1)
        if (e.key === 'ArrowRight') step(1)
      }}
      className="hw-sheet"
    >
      {fabric && (
        <div className="flex max-h-[inherit] flex-col overflow-y-auto overscroll-contain">
          <div className="relative flex justify-end px-3 pt-3">
            <span aria-hidden="true" className="absolute left-1/2 top-2 h-[5px] w-10 -translate-x-1/2 rounded-full bg-line md:hidden" />
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone">
              <XIcon aria-hidden="true" size={22} />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-4 pb-5">
            {/* Keyed by fabric, so a new one always starts zoomed out. */}
            <Swatch key={fabric.id} fabric={fabric} onSwipe={step} />

            <div className="flex items-center gap-2">
              <StepButton label="Previous fabric" onClick={() => step(-1)} hidden={count < 2}>
                <CaretLeftIcon aria-hidden="true" size={20} weight="bold" />
              </StepButton>
              <div aria-live="polite" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                <h2 className="text-[26px] leading-tight">{fabric.name}</h2>
                <p className="text-[15px] text-slate">
                  {fabric.collection} · {fabric.code}
                </p>
                {detail?.(fabric)}
              </div>
              <StepButton label="Next fabric" onClick={() => step(1)} hidden={count < 2}>
                <CaretRightIcon aria-hidden="true" size={20} weight="bold" />
              </StepButton>
            </div>

            <div className="flex flex-col gap-3">{children(fabric)}</div>
            <p className="text-center text-[13px] text-slate">Colours on screens vary a little.{count > 1 ? ' Swipe for the next fabric.' : ''}</p>
          </div>
        </div>
      )}
    </dialog>
  )
}

function StepButton({ label, onClick, hidden, children }: { label: string; onClick: () => void; hidden: boolean; children: ReactNode }) {
  if (hidden) return <span aria-hidden="true" className="size-11 shrink-0" />
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:border-velvet">
      {children}
    </button>
  )
}

/** The fabric cut with pinking shears, as large as the window allows; a tap looks closer at that spot. */
function Swatch({ fabric, onSwipe }: { fabric: ViewedFabric; onSwipe: (by: number) => void }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  return (
    <button
      type="button"
      aria-label={zoom ? 'Step back' : `Look closer at ${fabric.name}`}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY }
        swiped.current = false
      }}
      onPointerUp={(e) => {
        const from = start.current
        start.current = null
        if (!from || zoom) return
        const dx = e.clientX - from.x
        if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(e.clientY - from.y) * 1.5) {
          swiped.current = true
          onSwipe(dx < 0 ? 1 : -1)
        }
      }}
      onClick={(e) => {
        if (swiped.current) return
        if (zoom) return setZoom(null)
        // From the keyboard (no pointer position), the middle.
        const box = e.currentTarget.getBoundingClientRect()
        const pointer = e.detail > 0 && box.width > 0
        setZoom({
          x: pointer ? Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100)) : 50,
          y: pointer ? Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100)) : 50,
        })
      }}
      // As large as the window's height allows with the name and buttons still in view (92svh on phones, 85vh from tablets up, as .hw-sheet).
      className={cn(
        'relative mx-auto block aspect-square w-full max-w-[min(100%,calc(92svh-290px))] touch-pan-y md:max-w-[min(100%,calc(85vh-290px))]',
        zoom ? 'cursor-zoom-out' : 'cursor-zoom-in',
      )}
    >
      {/* The cut edge is on the inside, so the focus ring around the button isn't cut off. */}
      <span className="pinked absolute inset-0 overflow-hidden" style={{ backgroundColor: fabric.hex ?? '#F5F1EF' }}>
        {fabric.image && (
          <Image
            src={fabric.image}
            alt=""
            fill
            // Straight away: the window has just opened for it.
            loading="eager"
            // Sharper when looking closer: the browser picks a wider copy for the bigger size.
            sizes={zoom ? '(min-width: 768px) 1300px, 260vw' : '(min-width: 768px) 512px, 100vw'}
            className="object-cover transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={zoom ? { transform: `scale(${ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            draggable={false}
          />
        )}
      </span>
    </button>
  )
}
