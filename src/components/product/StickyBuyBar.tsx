'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useBottomCover } from '@/lib/ui/bottom-cover'
import { WhatsAppButton, type WhatsAppButtonProps } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'

/**
 * "Add £749" at the bottom of the screen whenever the page's own "Add to
 * basket" is off screen, above or below (audit A1, owner 31 October 2026):
 * people from ads land with that button two screens down. It does exactly what
 * the main button does. WhatsApp sits beside it, so the floating WhatsApp
 * button steps aside on product pages (globals.css, [data-buy-bar]).
 *
 * Phones show it from the first paint (the main button is always below the
 * first screen there); wider screens wait until the page knows where the main
 * button is. Hidden, and out of the tab order, while the main button is on
 * screen.
 */
export function StickyBuyBar({
  price,
  onAdd,
  watch,
  name,
  detail,
  whatsApp,
}: {
  price: number
  onAdd: () => void
  watch: RefObject<HTMLElement | null>
  /** Shown beside the button on wide screens: "Ashton" and "5 seater corner, high back · Grey". */
  name: string
  detail: string | null
  whatsApp: Omit<WhatsAppButtonProps, 'children' | 'className'> & { noun: string }
}) {
  // null until the page knows whether the main button is on screen.
  const [shown, setShown] = useState<boolean | null>(null)
  const bar = useRef<HTMLDivElement>(null)
  // Room at the end of the page while it's up, so it never covers the footer or a focused link.
  useBottomCover('buy-bar', bar, shown !== false)

  useEffect(() => {
    const target = watch.current
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setShown(!entry.isIntersecting)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [watch])

  const { noun, ...chat } = whatsApp
  const amount = formatPrice(price)

  return (
    <div
      ref={bar}
      data-buy-bar=""
      inert={shown === false}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 transition-transform duration-200 print:hidden lg:px-6 lg:pb-3 lg:pt-3',
        shown === true && 'translate-y-0',
        shown === false && 'translate-y-full',
        shown === null && 'translate-y-0 lg:invisible lg:translate-y-full',
      )}
    >
      {/* Lined up with the page's content (1200 px less its side padding). */}
      <div className="mx-auto flex max-w-[1152px] items-center gap-3">
        <p className="hidden min-w-0 flex-1 flex-col lg:flex">
          <span className="truncate font-display text-[22px] leading-tight">{name}</span>
          {detail && <span className="truncate text-[14px] text-slate">{detail}</span>}
        </p>
        <WhatsAppButton
          {...chat}
          className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-line bg-white text-velvet no-underline hover:border-velvet"
        >
          <WhatsAppGlyph size={26} />
          <span className="sr-only">Ask about this {noun} on WhatsApp</span>
        </WhatsAppButton>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${amount} to basket`}
          className="min-h-[52px] flex-1 rounded-full bg-velvet-sheen px-6 text-[17px] font-semibold text-white lg:min-w-[300px] lg:flex-none"
        >
          Add {amount}
        </button>
      </div>
    </div>
  )
}
