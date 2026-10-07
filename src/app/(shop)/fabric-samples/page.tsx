import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FEATURES } from '@/config/features'
import { SAMPLES } from '@/config/samples'
import { getFabricLibrary } from '@/lib/catalogue/listing'
import { getSampleLimit } from '@/lib/product/load'
import { SamplesForm, type SampleCollection } from './SamplesForm'

export const metadata: Metadata = {
  title: 'Fabric samples',
  description: `See our fabrics at home before you choose: up to 5 samples for ${SAMPLES.fee}, taken off your sofa when you buy.`,
  alternates: { canonical: SAMPLES.href },
}

const codesFrom = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((x) => x.split(','))
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)

export default async function FabricSamplesPage({ searchParams }: { searchParams: Promise<{ fabric?: string | string[] }> }) {
  if (!FEATURES.samples) notFound()
  const [library, limit, { fabric }] = await Promise.all([getFabricLibrary(), getSampleLimit(), searchParams])
  const collections: SampleCollection[] = library
    .map((c) => ({ slug: c.slug, name: c.name, fabrics: c.fabrics.filter((f) => f.swatchable) }))
    .filter((c) => c.fabrics.length > 0)
  const wanted = codesFrom(fabric)
  const initialIds = collections.flatMap((c) => c.fabrics).filter((f) => wanted.includes(f.code.toUpperCase())).map((f) => f.id)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-16 pt-6 lg:px-6 lg:pt-10">
      <header className="flex max-w-[46rem] flex-col gap-3">
        <h1 className="text-[32px] leading-tight lg:text-[44px]">Fabric samples</h1>
        <p className="text-[17px] leading-relaxed text-slate">
          See and feel our fabrics at home before you choose. Pick up to {limit} and we’ll post you a sample of each: {SAMPLES.fee} for the set, and we take
          the {SAMPLES.fee} off your sofa when you buy.
        </p>
      </header>
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          ['Choose your fabrics', `Up to ${limit}, from any collection.`],
          ['We get in touch', `We ring or WhatsApp you to arrange the ${SAMPLES.fee}. Nothing is paid online.`],
          ['They arrive by post', `Then, if you order your sofa, the ${SAMPLES.fee} comes off the price.`],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-3 rounded-[var(--radius-card)] bg-stone p-4">
            <span aria-hidden="true" className="bg-gold-sheen flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[19px] font-bold text-wine">
              {i + 1}
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{title}</span>
              <span className="text-[15px] text-slate">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      <SamplesForm collections={collections} limit={limit} initialIds={initialIds} />
    </div>
  )
}
