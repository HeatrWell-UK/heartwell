import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CaretRightIcon, RulerIcon } from '@phosphor-icons/react/ssr'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AlcoveFloor, Arcade, Medallion } from '@/components/catalogue/Arcade'
import { RangeCard, rangeSizeCount } from '@/components/catalogue/RangeCard'
import { ScalePlan } from '@/components/catalogue/ScalePlan'
import { buttonClasses } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { WhatsAppTopic } from '@/components/whatsapp/WhatsAppTopic'
import { formatPrice } from '@/lib/format'
import { getFabricLibrary, getListing, rangesFrom, type RangeSummary } from '@/lib/catalogue/listing'
import { planFrame, planSummary, rangeSizes, sizePhotos, type RangeSize } from '@/lib/catalogue/range-sizes'
import { homeRanges } from '@/lib/home/picks'
import { breadcrumbJsonLd, jsonLdString } from '@/lib/product/seo'
import { SITE_URL } from '@/config/site'
import { QuestionList } from '@/components/content/QuestionList'
import { rangeQuestions } from '@/lib/seo/answers'
import { getDeliveryInfo } from '@/lib/product/load'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

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
  // Written for "<range> sofa", "<range> corner sofa" and "<range> dimensions" (docs/KEYWORDS.md).
  const noun = /recliner/i.test(range.name) ? '' : ' sofas'
  return {
    title: `${range.name}${noun}: sizes, dimensions and prices`,
    description: `The ${range.name} range at Heartwell: ${sizes} ${sizes === 1 ? 'size' : 'sizes'} from ${formatPrice(range.price)}${range.madeToOrder ? ', made to order in your choice of fabric' : ''}, each drawn to scale. Free delivery to most areas, pay on delivery.`,
    alternates: { canonical: `/ranges/${range.slug}` },
  }
}

const orFormat = new Intl.ListFormat('en-GB', { type: 'disjunction' })
const numberWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six']

/** "£749", or "from £699" when the size comes in more than one back style or colour. */
function sizePrice(s: RangeSize): string {
  const price = Math.min(...s.options.map((o) => o.price))
  return `${s.options.length > 1 || s.options.some((o) => o.from) ? 'from ' : ''}${formatPrice(price)}`
}

/**
 * A range, as a gallery on lit velvet (docs/DESIGN.md, revision 4): its name
 * in gold, its cover in the middle alcove with the price it starts from, its
 * other sizes' photos either side, and its own words under the floor. Then
 * every size drawn to one scale with its price in each back style, so the
 * choice is which size fits the room. Colours and fabrics are chosen on the
 * size's own page.
 */
export default async function RangePage({ params }: Props) {
  const [{ range, ranges }, fabrics, delivery] = await Promise.all([
    findRange((await params).slug),
    getFabricLibrary(),
    SUPABASE_CONFIGURED ? getDeliveryInfo().catch(() => null) : Promise.resolve(null),
  ])
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
      <WhatsAppTopic message={`Hi Heartwell, I have a question about the ${range.name} range: ${SITE_URL}/ranges/${range.slug}`} context="sticky-range" />

      {/* The range's own gallery: its cover in the middle alcove, its other sizes either side, its words under the floor. */}
      <header className="hw-gallery hw-velvet text-white">
        <Breadcrumbs items={[{ name: 'Ranges', href: '/ranges' }]} onVelvet />
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2.5 px-4 pt-1 text-center lg:gap-3 lg:pt-2">
          <h1 className="hw-gallery-title text-[clamp(2.75rem,13vw,4.5rem)] leading-none lg:text-[min(6vw,5.5rem)]">
            <span className="text-gold-lit block pb-[0.08em]">{range.name}</span>
          </h1>
          <p className="max-w-[34rem] text-[15px] leading-snug text-on-wine sm:text-[17px]">
            {sizeWord}
            {styles.length > 1 && ` in ${numberWords[styles.length] ?? styles.length} back styles`}.{' '}
            {range.madeToOrder && fabricCount > 0
              ? `Made to order in the colours shown or any of our ${fabricCount} fabrics.`
              : 'In the colours shown.'}
          </p>
        </div>

        <Arcade
          main={{ src: range.image, alt: range.imageAlt, sizes: '(min-width: 1680px) 400px, (min-width: 1024px) 24vw, (min-width: 640px) 39vw, 80vw' }}
          side={sizePhotos(range.products, sizes, range.image).map(({ size, image }) => ({
            key: size.key,
            href: `/products/${size.options[0]!.slug}`,
            image,
            title: size.label,
            detail: sizePrice(size),
          }))}
          sideLabel={`More sizes of ${range.name}`}
          square
          className="mt-6 sm:mt-8 lg:mt-7"
        >
          <Medallion label="from" value={formatPrice(range.price)} />
          <AlcoveFloor>
            <a href="#sizes" className={buttonClasses({ className: 'px-9 shadow-[0_10px_24px_-10px_rgb(40_8_14/0.8)]' })}>
              Choose a size
            </a>
          </AlcoveFloor>
        </Arcade>

        <div className="hw-floor">
          <div className="mx-auto grid max-w-[1200px] gap-6 px-4 pb-8 pt-7 sm:pt-12 lg:grid-cols-[3fr_2fr] lg:gap-16 lg:px-6 lg:pb-12 lg:pt-14">
            {range.description && <p className="max-w-[40rem] text-[17px] leading-relaxed text-on-wine lg:text-lg">{range.description}</p>}
            <div className="flex flex-col gap-5">
              {range.colours.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Colours">
                  {range.colours.map((c) => (
                    <li key={c.name} className="flex items-center gap-1.5 text-[15px] text-on-wine">
                      <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-white/40" style={{ backgroundColor: c.hex ?? '#F5F1EF' }} />
                      {c.name}
                    </li>
                  ))}
                </ul>
              )}
              <WhatsAppButton
                message={`Hi Heartwell, I have a question about the ${range.name} range.`}
                context="range"
                className={buttonClasses({ variant: 'onWineOutline', block: true, className: 'sm:w-auto sm:self-start' })}
              >
                <WhatsAppGlyph />
                Ask about {range.name}
              </WhatsAppButton>
            </div>
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

      <div className="mx-auto max-w-[1200px] px-4 pt-14 lg:px-6 lg:pt-24">
        <QuestionList
          id="range-questions"
          title={`Questions about ${range.name}`}
          items={rangeQuestions(range, { delivery, fabricCount })}
          structured
          className="max-w-[46rem]"
        />
      </div>

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
