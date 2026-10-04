'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Sheet } from '@/components/ui/Sheet'
import { FEATURES } from '@/config/features'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { FabricCollectionView, FabricView } from '@/lib/product/types'

export interface ChosenFabric {
  fabric: FabricView
  collection: FabricCollectionView
}

/** A fabric cut with pinking shears: photo where there is one, its colour behind. */
export function FabricSwatch({ fabric, size = 48 }: { fabric: FabricView; size?: number }) {
  return (
    <span className="pinked relative block shrink-0 overflow-hidden" style={{ width: size, height: size, backgroundColor: fabric.hex ?? '#F5F1EF' }}>
      {fabric.image && <Image src={fabric.image} alt="" fill sizes={`${size}px`} className="object-cover" />}
    </span>
  )
}

export function FabricSheet({
  open,
  onClose,
  collections,
  chosen,
  onChoose,
  rangeName,
}: {
  open: boolean
  onClose: () => void
  collections: FabricCollectionView[]
  chosen: ChosenFabric | null
  onChoose: (choice: ChosenFabric | null) => void
  rangeName: string
}) {
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)
  const anySurcharge = collections.some((c) => c.surcharge > 0)

  return (
    <Sheet open={open} onClose={onClose} title="Choose your fabric">
      <div className="flex flex-col gap-6">
        <p className="text-[15px] leading-relaxed text-slate">
          {rangeName} is made to order, so you can have it in any of these {total} fabrics
          {anySurcharge ? '. Some collections cost a little more, shown below.' : ' for the same price.'} Colours on screens vary a little.
        </p>

        {FEATURES.samples && (
          <Link href="/fabric-samples" className="text-[15px] font-semibold">
            Order up to 5 fabric samples
          </Link>
        )}

        {collections.map((c) => (
          <fieldset key={c.slug} className="flex flex-col gap-3">
            <legend className="mb-3 flex items-baseline gap-2 font-display text-lg font-bold">
              {c.name}
              {c.surcharge > 0 && <span className="font-sans text-sm font-semibold text-slate">+{formatPrice(c.surcharge)}</span>}
            </legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-x-2 gap-y-3">
              {c.fabrics.map((f) => {
                const isChosen = chosen?.fabric.id === f.id
                return (
                  <label
                    key={f.id}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1.5 text-center has-[:focus-visible]:shadow-[var(--shadow-focus)]',
                      isChosen && 'bg-gold-tint',
                    )}
                  >
                    <input
                      type="radio"
                      name="fabric"
                      className="sr-only"
                      checked={isChosen}
                      onChange={() => onChoose({ fabric: f, collection: c })}
                    />
                    <FabricSwatch fabric={f} size={52} />
                    <span className="text-[13px] font-semibold leading-tight text-ink">{f.name}</span>
                    <span className="text-[12px] leading-none text-slate">{f.code}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}

        {chosen && (
          <button type="button" onClick={() => onChoose(null)} className="self-start text-[15px] font-semibold text-velvet underline underline-offset-4">
            Use a colour in the photos instead
          </button>
        )}
      </div>
    </Sheet>
  )
}
