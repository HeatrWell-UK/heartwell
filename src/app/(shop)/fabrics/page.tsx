import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { WhenNear } from '@/components/ui/WhenNear'
import { ButtonLink } from '@/components/ui/Button'
import { FEATURES } from '@/config/features'
import { SAMPLES } from '@/config/samples'
import { formatPrice } from '@/lib/format'
import { getFabricLibrary } from '@/lib/catalogue/listing'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Our fabrics',
  description: 'The fabric library for Heartwell’s made-to-order sofas: plush velvet, chenille, crushed velvet and more, in every colour we offer.',
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
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pt-10 lg:px-6 lg:pt-14">
      {collections.map((c, ci) => (
        <section key={c.slug} aria-labelledby={`c-${c.slug}`} className="flex flex-col gap-4">
          <h2 id={`c-${c.slug}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[28px] leading-tight lg:text-[34px]">
            {c.name}
            <span className="font-sans text-[15px] font-normal text-slate">
              {c.fabrics.length} colours{c.surcharge > 0 ? `, +${formatPrice(c.surcharge)}` : ''}
            </span>
          </h2>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {c.fabrics.map((f) => (
              <li key={f.code} className="flex flex-col items-center gap-1.5 text-center">
                <span className="pinked relative block aspect-square w-full max-w-24 overflow-hidden" style={{ backgroundColor: f.hex ?? '#F5F1EF' }}>
                  {f.image &&
                    (ci === 0 ? (
                      <Image src={f.image} alt="" width={96} height={96} className="size-full object-cover" />
                    ) : (
                      <WhenNear className="absolute inset-0">
                        <Image src={f.image} alt="" width={96} height={96} className="size-full object-cover" />
                      </WhenNear>
                    ))}
                </span>
                <span className="text-[14px] font-semibold leading-tight">{f.name}</span>
                <span className="text-[12px] text-slate">{f.code}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      </div>
    </div>
  )
}
