import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaretRightIcon, RulerIcon } from '@phosphor-icons/react/ssr'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { RangeCard, rangeSizeCount } from '@/components/catalogue/RangeCard'
import { ScalePlan } from '@/components/catalogue/ScalePlan'
import { buttonClasses } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { formatPrice } from '@/lib/format'
import { getFabricLibrary, getListing, rangesFrom, type RangeSummary } from '@/lib/catalogue/listing'
import { planFrame, planSummary, rangeSizes, type RangeSize } from '@/lib/catalogue/range-sizes'
import { homeRanges } from '@/lib/home/picks'
import { breadcrumbJsonLd, jsonLdString } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

/** Every range is built ahead and refreshed every five minutes; a new range is built on its first visit. */
export async function generateStaticParams() {
  return rangesFrom(await getListing()).map((r) => ({ slug: r.slug }))
}

async function findRange(slug: string) {
  const ranges = rangesFrom(await getListing())
  return { range: ranges.find((r) => r.slug === slug) ?? null, ranges }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { range } = await findRange((await params).slug)
  if (!range) return {}
  const sizes = rangeSizeCount(range)
  return {
    title: `${range.name} sofas`,
    description: `The ${range.name} range at Heartwell: ${sizes} ${sizes === 1 ? 'size' : 'sizes'} from ${formatPrice(range.price)}${range.madeToOrder ? ', made to order in your choice of fabric' : ''}. Free UK Mainland delivery, pay on delivery.`,
    alternates: { canonical: `/ranges/${range.slug}` },
  }
}

const orFormat = new Intl.ListFormat('en-GB', { type: 'disjunction' })
const numberWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six']

/**
 * A range: its own room photo and words first, then every size drawn to one
 * scale with its price in each back style, so the choice is which size fits
 * the room. Colours and fabrics are chosen on the size's own page.
 */
export default async function RangePage({ params }: Props) {
  const [{ range, ranges }, fabrics] = await Promise.all([findRange((await params).slug), getFabricLibrary()])
  if (!range) notFound()

  const fabricCount = fabrics.reduce((n, c) => n + c.fabrics.length, 0)
  const sizes = rangeSizes(range.products)
  const styles = [...new Set(sizes.flatMap((s) => s.options.map((o) => o.style)).filter((v): v is string => Boolean(v)))]
  const frame = planFrame(sizes.map((s) => s.plan))
  const others = homeRanges(
    ranges.filter((r) => r.slug !== range.slug),
    4,
  )
  const sizeWord = `${sizes.length} ${sizes.length === 1 ? 'size' : 'sizes'}`

  return (
    <div className="pb-16 lg:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd([{ name: 'Ranges', path: '/ranges' }, { name: range.name, path: `/ranges/${range.slug}` }], SITE_URL)) }}
      />
      <Breadcrumbs items={[{ name: 'Ranges', href: '/ranges' }]} />

      <header className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[6fr_5fr] lg:items-center lg:gap-14 lg:px-6 lg:pt-4">
        <div className="relative aspect-square overflow-hidden bg-stone lg:rounded-[24px]">
          {range.image && (
            <Image
              src={range.image}
              alt={range.imageAlt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1200px) 620px, (min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-5 px-4 lg:px-0">
          <h1 className="text-[44px] leading-none lg:text-[64px]">{range.name}</h1>
          {range.description && <p className="text-[17px] leading-relaxed text-body-dark lg:text-lg">{range.description}</p>}
          <p className="text-[16px] leading-relaxed text-slate">
            {sizeWord}
            {styles.length > 1 && ` in ${numberWords[styles.length] ?? styles.length} back styles`}, from{' '}
            <span className="font-semibold text-ink">{formatPrice(range.price)}</span>.{' '}
            {range.madeToOrder && fabricCount > 0
              ? `Made to order in the colours shown or any of our ${fabricCount} fabrics.`
              : 'In the colours shown.'}
          </p>
          {range.colours.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Colours">
              {range.colours.map((c) => (
                <li key={c.name} className="flex items-center gap-1.5 text-[15px]">
                  <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex ?? '#F5F1EF' }} />
                  {c.name}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <a href="#sizes" className={buttonClasses({ block: true, className: 'sm:w-auto' })}>
              Choose a size
            </a>
            <WhatsAppButton
              message={`Hi Heartwell, I have a question about the ${range.name} range.`}
              context="range"
              className={buttonClasses({ variant: 'secondary', block: true, className: 'sm:w-auto' })}
            >
              <WhatsAppGlyph />
              Ask about {range.name}
            </WhatsAppButton>
          </div>
        </div>
      </header>

      <section id="sizes" aria-labelledby="sizes-title" className="mx-auto flex max-w-[1200px] scroll-mt-4 flex-col gap-6 px-4 pt-14 lg:gap-8 lg:px-6 lg:pt-24">
        <div className="flex flex-col gap-2">
          <h2 id="sizes-title" className="text-[30px] leading-tight lg:text-[42px]">
            {sizes.length === 1 ? 'The size, drawn to scale' : 'Every size, drawn to scale'}
          </h2>
          <p className="max-w-[40rem] text-[16px] leading-relaxed text-slate lg:text-[17px]">
            {sizes.length === 1 ? 'Seen from above, with its measurements.' : 'Seen from above and drawn to the same scale, so you can compare them.'}
            {styles.length > 1 &&
              (sizes.every((s) => s.options.length === styles.length)
                ? ` Each size comes with a ${orFormat.format(styles.map((s) => s.toLowerCase()))}.`
                : ' Some sizes come with a choice of back.')}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {sizes.map((s) => (
            <li key={s.key}>
              <SizeCard size={s} frame={frame} />
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-3 text-[15px] leading-relaxed text-slate">
          <RulerIcon aria-hidden="true" size={22} className="mt-px shrink-0 text-velvet" />
          <span>
            Measure the space, and the doors and stairs it has to come through.{' '}
            <Link href="/will-it-fit" className="font-semibold">
              Will it fit?
            </Link>
          </span>
        </p>
      </section>

      {others.length > 0 && <OtherRanges ranges={others} />}
    </div>
  )
}

/**
 * One size: its plan on a stone ground, its name and measurement, and a link
 * to each back style with its price. With one style the whole card is the link.
 */
function SizeCard({ size: s, frame }: { size: RangeSize; frame: { w: number; d: number } | null }) {
  const single = s.options.length === 1 ? s.options[0]! : null
  const summary = s.plan ? planSummary(s.plan) : null
  const plan = (
    <span className="flex min-h-24 items-end justify-center rounded-[14px] bg-stone px-2.5 py-3">
      {s.plan && frame ? (
        <ScalePlan layout={s.plan} frame={frame} seats={s.seats} />
      ) : (
        <span className="self-center text-[13px] text-slate">Measurements on its page</span>
      )}
    </span>
  )
  const heading = (
    <span className="flex flex-col gap-0.5">
      <span className="text-[16px] font-semibold leading-snug text-ink">{s.label}</span>
      {summary && <span className="text-[14px] text-slate">{summary}</span>}
    </span>
  )

  if (single) {
    return (
      <Link href={`/products/${single.slug}`} className="group flex h-full flex-col gap-3 text-ink no-underline hover:text-ink">
        {plan}
        {heading}
        <span className="flex items-baseline gap-1.5">
          {single.from && <span className="text-[13px] text-slate">from</span>}
          <Price amount={single.price} className="text-[19px] group-hover:text-velvet" />
        </span>
      </Link>
    )
  }
  return (
    <div className="flex h-full flex-col gap-3">
      {plan}
      {heading}
      <ul className="flex flex-col border-t border-line-soft">
        {s.options.map((o) => (
          <li key={o.slug} className="border-b border-line-soft">
            <Link href={`/products/${o.slug}`} className="group flex min-h-11 items-center justify-between gap-2 text-ink no-underline hover:text-velvet">
              <span className="text-[14px] leading-tight">
                {o.style}
                <span className="sr-only">, {s.label.toLowerCase()}</span>
              </span>
              <span className="flex items-center gap-1">
                {o.from && <span className="text-[12px] text-slate">from</span>}
                <Price amount={o.price} className="text-[17px] group-hover:text-velvet" />
                <CaretRightIcon aria-hidden="true" size={14} className="text-slate" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OtherRanges({ ranges }: { ranges: RangeSummary[] }) {
  return (
    <section aria-labelledby="other-ranges" className="mx-auto flex max-w-[1200px] flex-col gap-6 pt-14 lg:gap-8 lg:px-6 lg:pt-24">
      <div className="flex items-end justify-between gap-6 px-4 lg:px-0">
        <h2 id="other-ranges" className="text-[30px] leading-tight lg:text-[42px]">
          Other ranges
        </h2>
        <Link href="/ranges" className="shrink-0 text-[16px] font-semibold">
          See them all
        </Link>
      </div>
      <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
        {ranges.map((r) => (
          <li key={r.slug} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
            <RangeCard range={r} sizes="(min-width: 1200px) 280px, (min-width: 1024px) 23vw, (min-width: 640px) 42vw, 72vw" />
          </li>
        ))}
      </ul>
    </section>
  )
}
