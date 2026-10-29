import Image from 'next/image'
import { ScissorsIcon } from '@phosphor-icons/react/ssr'
import { WhenNear } from '@/components/ui/WhenNear'
import { ButtonLink } from '@/components/ui/Button'
import Link from 'next/link'
import { FEATURES } from '@/config/features'
import { SAMPLES } from '@/config/samples'
import type { FabricCollection } from '@/lib/catalogue/listing'
import { homeSwatches } from '@/lib/home/picks'

/**
 * "Your sofa, in your fabric": the wine section with a card of pinked swatches,
 * named the way the fabric picker names them: each the fabric's own photo (the
 * colour shows until it loads), lifting a little when touched, like a sample
 * picked up. Phones read heading, swatches, then the actions; desktops put the
 * swatches beside the words.
 */
export function FabricStory({ collections }: { collections: FabricCollection[] }) {
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)
  // Full rows only: up to 16 on phones (4 across), up to 12 on desktops (6 across), spread light to dark.
  const swatches = homeSwatches(collections, 16)
  const phone = Math.floor(swatches.length / 4) * 4
  if (total === 0 || phone === 0) return null
  const desktop = phone < 6 ? phone : Math.min(12, Math.floor(phone / 6) * 6)
  const onDesktop = new Set(Array.from({ length: desktop }, (_, i) => Math.round((i * (phone - 1)) / Math.max(1, desktop - 1))))

  return (
    <section aria-labelledby="fabrics" className="mt-14 bg-wine text-white lg:mt-24">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 lg:grid-cols-[5fr_6fr] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-6 lg:px-6 lg:py-20">
        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
          <h2 id="fabrics" className="text-gold-lit text-[32px] leading-[1.1] lg:text-[46px]">
            Your sofa, in your fabric
          </h2>
          <p className="text-[17px] leading-relaxed text-on-wine">
            Our fabric sofas are made to order in the UK. Choose the shape and size, then any of our {total} fabrics in {collections.length}{' '}
            collections: {new Intl.ListFormat('en-GB').format(collections.map((c) => c.name))}.
          </p>
        </div>

        <ul
          className="grid grid-cols-4 gap-x-3 gap-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-5 lg:self-center"
          aria-label="Some of our fabric colours"
        >
          {swatches.slice(0, phone).map((f, i) => (
            <li key={f.code} className={`flex flex-col items-center gap-2 ${onDesktop.has(i) ? '' : 'lg:hidden'}`}>
              {/* The lift is on the outer span: the pinked edge would clip its shadow. */}
              <span aria-hidden="true" className="hw-swatch block w-full">
                <span className="pinked relative block aspect-square w-full overflow-hidden" style={{ backgroundColor: f.hex }}>
                  {f.image && (
                    <WhenNear className="absolute inset-0">
                      <Image src={f.image} alt="" fill sizes="(min-width: 1024px) 96px, 23vw" className="object-cover" />
                    </WhenNear>
                  )}
                </span>
              </span>
              <span className="text-center text-[13px] leading-tight text-on-wine-muted">{f.name}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
          {FEATURES.samples && (
            <p className="flex items-start gap-3 border-t border-white/15 pt-5 text-[15px] leading-relaxed text-on-wine">
              <ScissorsIcon aria-hidden="true" size={24} className="shrink-0 text-gold-pale" />
              <span>
                Want to feel them first?{' '}
                <Link href={SAMPLES.href} className="font-semibold text-on-wine-link underline hover:text-white">
                  Order fabric samples
                </Link>
                , {SAMPLES.fee} for the set, taken off your sofa when you buy.
              </span>
            </p>
          )}
          <ButtonLink href="/fabrics" variant="gold" block className="sm:w-auto sm:self-start sm:px-10">
            See all {total} fabrics
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
