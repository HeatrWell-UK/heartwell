import type { Metadata } from 'next'
import Link from 'next/link'
import { FabricLibrary } from '@/components/fabrics/FabricLibrary'
import { ButtonLink } from '@/components/ui/Button'
import { FEATURES } from '@/config/features'
import { SAMPLES } from '@/config/samples'
import { getFabricLibrary } from '@/lib/catalogue/listing'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Sofa fabrics: plush velvet, chenille and more',
  description: 'The fabric library for Heartwell’s made-to-order sofas: plush velvet, chenille, crushed velvet and more, in every colour we offer. Samples by post.',
  alternates: { canonical: '/fabrics' },
}

export default async function FabricsPage() {
  const collections = await getFabricLibrary()
  const total = collections.reduce((n, c) => n + c.fabrics.length, 0)
  return (
    <div className="pb-16 lg:pb-24">
      {/* The same velvet ground as the fabric section on the home page. */}
      <header className="bg-wine text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-10 lg:px-6 lg:py-16">
          <h1 className="text-gold-lit text-[38px] leading-[1.06] lg:text-[56px]">Our fabrics</h1>
          <p className="max-w-[44rem] text-[17px] leading-relaxed text-on-wine lg:text-lg">
            Our made-to-order sofas can be made in any of these {total} fabrics. Choose the sofa first, then tap “Or choose from {total} fabrics”
            on its page. Colours on screens vary a little{FEATURES.samples ? ', so order samples if you’d like to see them in your room.' : '.'}
          </p>
          <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
            {FEATURES.samples && (
              <ButtonLink href={SAMPLES.href} variant="gold" block className="sm:w-auto sm:px-8">
                Order samples, {SAMPLES.fee} for the set
              </ButtonLink>
            )}
            <Link href="/sofas?mto=yes" className="text-[15px] font-semibold text-on-wine-link underline hover:text-white">
              See the sofas you can have in these fabrics
            </Link>
            <Link href="/guides/choosing-a-sofa-fabric" className="text-[15px] font-semibold text-on-wine-link underline hover:text-white">
              How to choose a fabric
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pt-8 lg:px-6 lg:pt-14">
        <p className="-mb-6 text-[15px] text-slate">Tap a fabric to see it close up.</p>
        <FabricLibrary collections={collections} samples={FEATURES.samples} />
      </div>
    </div>
  )
}
