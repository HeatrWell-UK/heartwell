'use client'

import { HeartIcon } from '@phosphor-icons/react'
import { useSaved } from '@/lib/basket/store'

/** The heart on the photo: keeps the piece in "Saved" on this device. */
export function SaveButton({ slug, sku, noun }: { slug: string; sku: string | null; noun: string }) {
  const saved = useSaved()
  const on = saved.isSaved(slug)
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Saved. Remove this ${noun} from your saved list` : `Save this ${noun}`}
      onClick={() => saved.toggle(slug, sku)}
      className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-white/95 text-velvet shadow-sm"
    >
      <HeartIcon aria-hidden="true" size={22} weight={on ? 'fill' : 'regular'} />
    </button>
  )
}
