import Link from 'next/link'
import { RulerIcon } from '@phosphor-icons/react/ssr'
import type { Piece } from '@/lib/catalogue/clean'
import type { SizeFields } from '@/lib/catalogue/display'
import { Measurements } from './Measurements'
import { WillItFit } from './WillItFit'

/**
 * "Will it fit?": the top view drawn to scale with every measurement, and the
 * door check beside it, on one wall panel (the inset line of the panelling in
 * the photos). The most useful thing on the page for a sofa bought unseen.
 */
export function FitPanel({
  shape,
  noun,
  dimensions,
  pieces,
  note,
  askHref,
}: {
  shape: string | null
  noun: string
  dimensions: SizeFields
  pieces: Piece[]
  note: string | null
  askHref: string
}) {
  const inSections = shape === 'corner' || shape === 'u-shape' || shape === 'set'
  return (
    <section aria-labelledby="fit" className="hw-panel mx-4 px-5 py-8 lg:mx-0 lg:px-12 lg:py-12">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="fit" className="text-[28px] leading-tight lg:text-[36px]">
              Will it fit?
            </h2>
            <p className="text-[15px] leading-relaxed text-slate lg:text-base">Seen from above and drawn to scale, with every measurement.</p>
          </div>
          <Measurements shape={shape} noun={noun} dimensions={dimensions} pieces={pieces} note={note} askHref={askHref} />
        </div>
        <div className="flex flex-col gap-4 lg:pt-[88px]">
          <WillItFit
            depth={dimensions.depth_cm}
            height={dimensions.height_cm}
            inSections={inSections}
            askHref={askHref}
            className="bg-white"
          />
          {inSections && (
            <p className="text-[15px] leading-relaxed text-body-dark">
              {shape === 'set'
                ? 'It comes as two separate sofas, so each one only has to get through the door on its own.'
                : 'It arrives in sections that go together in your room, so each part only has to get through the door on its own.'}
            </p>
          )}
          <p className="flex items-start gap-3 text-[15px] leading-relaxed text-slate">
            <RulerIcon aria-hidden="true" size={22} className="mt-px shrink-0 text-velvet" />
            <span>
              Check stairs and turns too.{' '}
              <Link href="/will-it-fit" className="font-semibold">
                How to measure up
              </Link>
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
