'use client'

import { HeartIcon } from '@phosphor-icons/react'
import { useSaved } from '@/lib/basket/store'

/** The heart on the photo: keeps the piece in "Saved" on this device. */
export function SaveButton({ slug, sku, noun, name, className = 'right-3 top-3 size-11', iconSize = 22 }: { slug: string; sku: string | null; noun: string; name?: string; className?: string; iconSize?: number }) {
  const saved = useSaved()
  const on = saved.isSaved(slug)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Saved. Remove ${name ?? `this ${noun}`} from your saved list` : `Save ${name ?? `this ${noun}`}`}
      onClick={() => saved.toggle(slug, sku)}
      className={`absolute flex items-center justify-center rounded-full bg-white/95 text-velvet shadow-sm ${className}`}
    >
      <HeartIcon aria-hidden="true" size={iconSize} weight={on ? 'fill' : 'regular'} />
    </button>
  )
}
