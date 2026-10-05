'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * A bottom sheet on phones, a centred panel on wider screens. Built on the
 * native <dialog>: it moves focus inside, keeps it there, closes on Escape and
 * makes the page behind inert. Tapping the dimmed area closes it too.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={cn('hw-sheet', className)}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
          <span aria-hidden="true" className="absolute left-1/2 top-2 h-[5px] w-10 -translate-x-1/2 rounded-full bg-line md:hidden" />
          <h2 className="pt-2 text-[22px] leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-stone">
            <XIcon aria-hidden="true" size={22} />
          </button>
        </div>
        {/* Contents render only while open, so a closed sheet adds nothing to the page. */}
        <div className="overflow-y-auto overscroll-contain px-4 pb-6 pt-2">{open && children}</div>
      </div>
    </dialog>
  )
}
