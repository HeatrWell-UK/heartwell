'use client'

import { useEffect, useState, type RefObject } from 'react'
import { Price } from '@/components/ui/Price'
import { cn } from '@/lib/cn'

/**
 * Price and "Add to basket" at the bottom of the screen on phones, once the
 * main button has scrolled out of view above. Hidden (and out of the tab
 * order) while the main button is on screen.
 */
export function StickyBuyBar({ price, onAdd, watch }: { price: number; onAdd: () => void; watch: RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const target = watch.current
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [watch])

  return (
    <div
      data-sticky-bar={shown ? 'shown' : 'hidden'}
      inert={!shown}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/97 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 transition-transform duration-200 lg:hidden',
        shown ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="flex items-center gap-3.5">
        <div className="flex shrink-0 flex-col">
          <Price amount={price} className="text-[22px] leading-tight" />
          <span className="text-[13px] text-slate">Pay on delivery</span>
        </div>
        <button type="button" onClick={onAdd} className="min-h-[52px] flex-1 rounded-full bg-velvet-sheen text-[17px] font-semibold text-white">
          Add to basket
        </button>
      </div>
    </div>
  )
}
