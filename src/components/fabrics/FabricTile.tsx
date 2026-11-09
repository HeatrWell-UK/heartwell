'use client'

import Image from 'next/image'
import { CheckIcon } from '@phosphor-icons/react'
import { WhenNear } from '@/components/ui/WhenNear'
import { cn } from '@/lib/cn'
import type { ViewedFabric } from './FabricViewer'

/**
 * A fabric in a grid: its swatch cut with pinking shears, its name and code.
 * A tap opens it large (FabricViewer), where the page's choice is made.
 */
export function FabricTile({
  fabric,
  selected = false,
  selectedLabel = 'chosen',
  onOpen,
  sizes,
  defer = false,
}: {
  fabric: ViewedFabric
  selected?: boolean
  /** Read out after the name when selected. */
  selectedLabel?: string
  onOpen: () => void
  sizes: string
  /** Load the photo only once it's about to scroll into view (further down long pages). */
  defer?: boolean
}) {
  const photo = fabric.image && <Image src={fabric.image} alt="" fill sizes={sizes} className="object-cover" />
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className={cn(
        'relative flex w-full flex-col items-center gap-1.5 rounded-2xl p-1.5 pb-2 text-center',
        selected ? 'bg-gold-tint ring-2 ring-velvet' : 'hover:bg-stone',
      )}
    >
      <span className="pinked relative block aspect-square w-full overflow-hidden" style={{ backgroundColor: fabric.hex ?? '#F5F1EF' }}>
        {photo && (defer ? <WhenNear className="absolute inset-0">{photo}</WhenNear> : photo)}
      </span>
      {selected && (
        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex size-7 items-center justify-center rounded-full bg-velvet text-white shadow-sm">
          <CheckIcon size={16} weight="bold" />
        </span>
      )}
      <span className="text-[15px] font-semibold leading-tight text-ink">{fabric.name}</span>
      <span className="text-[13px] leading-none text-slate">
        {fabric.code}
        {selected && <span className="sr-only">, {selectedLabel}</span>}
      </span>
    </button>
  )
}
