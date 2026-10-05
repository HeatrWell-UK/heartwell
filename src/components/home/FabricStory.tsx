import { ScissorsIcon } from '@phosphor-icons/react/ssr'
import { ButtonLink } from '@/components/ui/Button'
import { FEATURES } from '@/config/features'
import type { FabricCollection } from '@/lib/catalogue/listing'

/**
 * "Your sofa, in your fabric": the wine section with a row of pinked swatches
 * (colours only, no photos to load) and the way into the fabric library.
 */
export function FabricStory({ collections }: { collections: FabricCollection[] }) {
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)
  if (total === 0) return null
  // Twelve colours spread across the collections, so the row shows the range.
  const all = collections.flatMap((c) => c.fabrics.filter((f) => f.hex))
  const step = Math.max(1, Math.floor(all.length / 12))
  const swatches = all.filter((_, i) => i % step === 0).slice(0, 12)
  const names = collections.slice(0, 3).map((c) => c.name.toLowerCase())

  return (
    <section aria-labelledby="fabrics" className="mt-12 bg-wine text-white lg:mt-20">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-6 lg:py-16">
        <div className="flex flex-col gap-4">
          <h2 id="fabrics" className="text-gold-sheen text-[30px] leading-tight lg:text-[38px]">
            Your sofa, in your fabric
          </h2>
          <p className="text-[17px] leading-relaxed text-on-wine">
            Our fabric sofas are made to order in the UK. Pick the shape and size, then choose from {total} fabrics: {names.join(', ')} and more.
          </p>
          {FEATURES.samples && (
            <p className="flex items-start gap-3 rounded-2xl bg-white/8 p-4 text-[15px] text-on-wine">
              <ScissorsIcon aria-hidden="true" size={24} className="shrink-0 text-gold-pale" />
              Not sure? Order 5 samples for £5. We take the £5 off when you buy your sofa.
            </p>
          )}
          <ButtonLink href="/fabrics" variant="gold" block className="lg:w-auto lg:self-start lg:px-10">
            Browse the fabrics
          </ButtonLink>
        </div>
        <ul className="grid grid-cols-6 gap-2 lg:gap-3" aria-label="Some of our fabric colours">
          {swatches.map((f) => (
            <li key={f.code} title={f.name} className="pinked aspect-square" style={{ backgroundColor: f.hex! }}>
              <span className="sr-only">{f.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
