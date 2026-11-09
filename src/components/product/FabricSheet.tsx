'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { FabricTile } from '@/components/fabrics/FabricTile'
import { FabricViewer } from '@/components/fabrics/FabricViewer'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { FEATURES } from '@/config/features'
import { SAMPLES } from '@/config/samples'
import { formatPrice } from '@/lib/format'
import type { FabricCollectionView, FabricView } from '@/lib/product/types'

export interface ChosenFabric {
  fabric: FabricView
  collection: FabricCollectionView
}

/** A fabric cut with pinking shears: photo where there is one, its colour behind. */
export function FabricSwatch({ fabric, size = 48 }: { fabric: FabricView; size?: number }) {
  return (
    <span className="pinked relative block shrink-0 overflow-hidden" style={{ width: size, height: size, backgroundColor: fabric.hex ?? '#F5F1EF' }}>
      {fabric.image && <Image src={fabric.image} alt="" width={size} height={size} className="size-full object-cover" />}
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
  // A tap on a fabric opens it large, over the list, with "Build mine in this" under it (owner, 10 November 2026).
  const all = collections.flatMap((c) => c.fabrics.map((f) => ({ ...f, collection: c.name, surcharge: c.surcharge, choice: { fabric: f, collection: c } })))
  const [viewing, setViewing] = useState<number | null>(null)

  return (
    <>
    <Sheet open={open} onClose={onClose} title="Choose your fabric">
      <div className="flex flex-col gap-6">
        <p className="text-[15px] leading-relaxed text-slate">
          {rangeName} is made to order, so you can have it in any of these {total} fabrics
          {anySurcharge ? '. Some collections cost a little more, shown below.' : ' for the same price.'} Colours on screens vary a little.
        </p>

        {FEATURES.samples && (
          <Link href={chosen ? `${SAMPLES.href}?fabric=${encodeURIComponent(chosen.fabric.code)}` : SAMPLES.href} className="text-[15px] font-semibold">
            Not sure? Order fabric samples, {SAMPLES.fee} for the set
          </Link>
        )}

        {collections.map((c) => (
          <section key={c.slug} aria-label={c.name} className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-2 font-display text-lg">
              {c.name}
              {c.surcharge > 0 && <span className="font-sans text-sm font-semibold text-slate">+{formatPrice(c.surcharge)}</span>}
            </h3>
            {/* Three to a row: big enough to tell apart on a phone, short enough to scroll through. */}
            <ul className="grid grid-cols-3 gap-2">
              {c.fabrics.map((f) => (
                <li key={f.id}>
                  <FabricTile
                    fabric={{ ...f, collection: c.name }}
                    selected={chosen?.fabric.id === f.id}
                    selectedLabel="your choice"
                    onOpen={() => setViewing(all.findIndex((x) => x.id === f.id))}
                    sizes="(min-width: 768px) 160px, 31vw"
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {chosen && (
          <button type="button" onClick={() => onChoose(null)} className="self-start text-[15px] font-semibold text-velvet underline underline-offset-4">
            Use a colour in the photos instead
          </button>
        )}
      </div>
    </Sheet>

    <FabricViewer
      fabrics={all}
      index={open ? viewing : null}
      onIndex={setViewing}
      onClose={() => setViewing(null)}
      detail={(f) =>
        (f.surcharge > 0 || chosen?.fabric.id === f.id) && (
          <p className="text-[14px] font-semibold text-velvet">
            {[f.surcharge > 0 ? `+${formatPrice(f.surcharge)} on the price` : null, chosen?.fabric.id === f.id ? 'Your choice now' : null].filter(Boolean).join(' · ')}
          </p>
        )
      }
    >
      {(f) => (
        <>
          <Button
            block
            onClick={() => {
              setViewing(null)
              onChoose(f.choice)
            }}
          >
            Build mine in this
          </Button>
          {FEATURES.samples && (
            <Link href={`${SAMPLES.href}?fabric=${encodeURIComponent(f.code)}`} className="self-center text-[15px] font-semibold">
              Or order a sample first, {SAMPLES.fee} for the set
            </Link>
          )}
        </>
      )}
    </FabricViewer>
    </>
  )
}
