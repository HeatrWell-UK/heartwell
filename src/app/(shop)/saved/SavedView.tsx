'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HeartIcon, ImageIcon } from '@phosphor-icons/react'
import { ButtonLink } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { useSaved } from '@/lib/basket/store'
import { useHydrated } from '@/lib/basket/use-hydrated'
import type { SavedCard } from '@/lib/basket/refresh'
import { loadSaved } from '../basket/actions'

export function SavedView() {
  const saved = useSaved()
  const hydrated = useHydrated()
  const [cards, setCards] = useState<SavedCard[] | null>(null)
  const key = saved.items.map((i) => `${i.slug}:${i.sku}`).join('|')

  useEffect(() => {
    if (!hydrated) return
    const items = saved.items.map(({ slug, sku }) => ({ slug, sku }))
    if (items.length === 0) return
    let live = true
    loadSaved(items)
      .then((res) => {
        if (live && res.ok) setCards(res.cards)
      })
      .catch(() => {
        if (live) setCards([])
      })
    return () => {
      live = false
    }
    // Reload only when the saved list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key])

  if (!hydrated || (cards === null && saved.items.length > 0)) return <div aria-busy="true" />

  const shown = (cards ?? []).filter((c) => saved.isSaved(c.slug))
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-[17px] text-slate">Nothing saved yet. Tap the heart on any sofa to keep it here, on this phone.</p>
        <ButtonLink href="/sofas">Shop sofas</ButtonLink>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {shown.map((c) => (
        <li key={c.slug} className="relative flex flex-col gap-2">
          <Link href={c.href} className="flex flex-col gap-2 text-ink no-underline hover:text-ink">
            <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-stone">
              {c.image ? (
                <Image src={c.image} alt={c.imageAlt} fill sizes="(min-width: 1024px) 270px, 50vw" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-slate">
                  <ImageIcon aria-hidden="true" size={32} />
                </span>
              )}
            </span>
            <span className="text-[15px] font-semibold leading-snug">{c.title}</span>
            <Price amount={c.price} className="text-lg" />
          </Link>
          <button
            type="button"
            aria-label={`Remove ${c.title} from your saved list`}
            onClick={() => saved.toggle(c.slug, null)}
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-white/95 text-velvet shadow-sm"
          >
            <HeartIcon aria-hidden="true" size={22} weight="fill" />
          </button>
        </li>
      ))}
    </ul>
  )
}
