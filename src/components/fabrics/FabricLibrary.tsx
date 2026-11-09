'use client'

import { useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { SAMPLES } from '@/config/samples'
import { formatPrice } from '@/lib/format'
import type { FabricCollection } from '@/lib/catalogue/listing'
import { FabricTile } from './FabricTile'
import { FabricViewer } from './FabricViewer'
import { FABRIC_GRID, FABRIC_TILE_SIZES } from './grid'

/** The fabrics page's collections: a tap opens a fabric large, with a sample of it one tap away. */
export function FabricLibrary({ collections, samples }: { collections: FabricCollection[]; samples: boolean }) {
  const [viewing, setViewing] = useState<number | null>(null)
  const all = collections.flatMap((c) => c.fabrics.map((f) => ({ ...f, collection: c.name, surcharge: c.surcharge })))

  return (
    <>
      {collections.map((c, ci) => (
        <section key={c.slug} aria-labelledby={`c-${c.slug}`} className="flex flex-col gap-4">
          <h2 id={`c-${c.slug}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[28px] leading-tight lg:text-[34px]">
            {c.name}
            <span className="font-sans text-[15px] font-normal text-slate">
              {c.fabrics.length} colours{c.surcharge > 0 ? `, +${formatPrice(c.surcharge)}` : ''}
            </span>
          </h2>
          <ul className={FABRIC_GRID}>
            {c.fabrics.map((f) => (
              <li key={f.code}>
                <FabricTile
                  fabric={{ ...f, collection: c.name }}
                  onOpen={() => setViewing(all.findIndex((x) => x.id === f.id))}
                  sizes={FABRIC_TILE_SIZES}
                  defer={ci > 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <FabricViewer
        fabrics={all}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
        detail={(f) => f.surcharge > 0 && <p className="text-[14px] font-semibold text-velvet">+{formatPrice(f.surcharge)} on the sofa’s price</p>}
      >
        {(f) => (
          <>
            {samples && f.swatchable && (
              <ButtonLink href={`${SAMPLES.href}?fabric=${encodeURIComponent(f.code)}`} block>
                Order a sample of this
              </ButtonLink>
            )}
            <ButtonLink href="/sofas?mto=yes" variant="secondary" block>
              See the sofas made in it
            </ButtonLink>
            {samples && f.swatchable && <p className="text-center text-[14px] text-slate">Samples are {SAMPLES.fee} for the set, taken off your sofa when you buy.</p>}
          </>
        )}
      </FabricViewer>
    </>
  )
}
