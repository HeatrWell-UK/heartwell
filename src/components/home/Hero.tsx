import Image from 'next/image'
import Link from 'next/link'
import { CalendarCheckIcon, HandCoinsIcon } from '@phosphor-icons/react/ssr'
import { ButtonLink } from '@/components/ui/Button'
import { PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import type { RangeSummary } from '@/lib/catalogue/listing'
import type { WelcomeSettings } from '@/lib/offers/welcome'
import { HeroOffer } from './HeroOffer'

/**
 * The home hero, revision 4, "the lit gallery" (docs/DESIGN.md). The owner's
 * photos all stand the furniture in one room with a velvet alcove and a gold
 * rim, so the hero lines those alcoves up on a velvet wall: in the middle the
 * owner's room photo (Cloudinary, heartwell/Product Images/Elements) with the
 * "to pay today" medallion and the button on its floor; either side, the first
 * ranges, each named on a plate. As the page opens the alcoves light up one
 * after another (globals.css, "Motion").
 *
 * Under the gold floor line, what's true today: the real delivery dates for an
 * order placed now, paying the driver, and the visitor's welcome offer with
 * its real time left.
 */
const ROOM = 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792009391/Main-Hero-Background-Image.jpg'
const ROOM_ALT = 'A grey sofa with cream cushions in a red velvet alcove, in a panelled room with a herringbone oak floor'

// The photos are square and cropped to each arch (object-fit: cover), so each is shown a little wider than its alcove.
const ROOM_SIZES = '(min-width: 1680px) 454px, (min-width: 1024px) 27vw, (min-width: 640px) 44vw, 92vw'
const SIDE_SIZES = ['(min-width: 1024px) 21vw, (min-width: 640px) 28vw, 50vw', '(min-width: 1024px) 21vw, (min-width: 640px) 28vw, 50vw', '17vw', '17vw']

export function Hero({ ranges, windowLabel, welcome }: { ranges: RangeSummary[]; windowLabel: string | null; welcome: WelcomeSettings }) {
  const side = ranges.slice(0, 4)
  return (
    <section aria-labelledby="hero-title" className="hw-gallery hw-velvet text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2.5 px-4 pt-7 text-center sm:pt-10 lg:gap-3 lg:pt-9">
        <h1 id="hero-title" className="hw-gallery-title text-[clamp(2.2rem,9.8vw,4rem)] leading-[1.04] lg:text-[min(4.6vw,4.5rem)]">
          <span className="text-gold-lit block">Choose it today.</span> <span className="text-gold-lit block">Pay when it&rsquo;s home.</span>
        </h1>
        <p className="max-w-[30ch] text-[15px] leading-snug text-on-wine sm:max-w-none sm:text-[17px] lg:text-[18px]">
          Sofas delivered free to most of mainland Britain, usually in {PROMISES.delivery.timingShort}.
        </p>
      </div>

      <div className="hw-arcade mt-6 sm:mt-8 lg:mt-7">
        <div className="hw-alcove hw-arcade-main">
          <span aria-hidden="true" className="hw-alcove-glow" />
          <span aria-hidden="true" className="hw-alcove-rim" />
          <span className="hw-alcove-photo">
            <Image src={ROOM} alt={ROOM_ALT} fill sizes={ROOM_SIZES} loading="eager" fetchPriority="high" />
            <span aria-hidden="true" className="hw-alcove-dim" />
          </span>
          <span aria-hidden="true" className="hw-alcove-line" />
          <p className="hw-medallion">
            <span className="text-[13px] font-semibold lg:text-[14px]">To pay today</span>
            <span className="font-display text-[44px] lg:text-[52px]">£0</span>
          </p>
          <div className="hw-alcove-floor">
            <ButtonLink href="/sofas" className="px-9 shadow-[0_10px_24px_-10px_rgb(40_8_14/0.8)]">
              Shop sofas
            </ButtonLink>
          </div>
        </div>

        {side.length > 0 && (
          <ul className="hw-arcade-side" aria-label="Some of our ranges">
            {side.map((r, i) => (
              <li key={r.slug}>
                <Link href={`/ranges/${r.slug}`} className="hw-alcove group text-white no-underline hover:text-white">
                  <span aria-hidden="true" className="hw-alcove-glow" />
                  <span aria-hidden="true" className="hw-alcove-rim" />
                  <span className="hw-alcove-photo">
                    {r.image && <Image src={r.image} alt="" fill sizes={SIDE_SIZES[i]} />}
                    <span aria-hidden="true" className="hw-alcove-dim" />
                  </span>
                  <span aria-hidden="true" className="hw-alcove-line" />
                  <span className="hw-plaque">
                    <span className="text-gold-lit font-display text-[18px] leading-none lg:text-[20px]">{r.name}</span>{' '}
                    <span className="text-[13px] leading-none text-on-wine-muted">from {formatPrice(r.price)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Today, in three facts, under the floor the alcoves stand on. */}
      <div className="hw-floor">
        <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-4 gap-y-4 px-4 pb-6 pt-6 sm:grid-cols-3 sm:gap-x-8 sm:pt-12 lg:px-6 lg:pb-8 lg:pt-14">
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
              <CalendarCheckIcon aria-hidden="true" size={17} className="shrink-0 text-gold-pale" />
              {windowLabel ? 'Order today, at your door' : 'Delivery'}
            </dt>
            <dd className="text-[17px] font-semibold leading-snug lg:text-[19px]">{windowLabel ?? `Usually ${PROMISES.delivery.timingShort}`}</dd>
          </div>
          <div className="flex flex-col gap-1 border-l border-white/15 pl-4 sm:pl-8">
            <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
              <HandCoinsIcon aria-hidden="true" size={17} className="shrink-0 text-gold-pale" />
              On delivery
            </dt>
            <dd className="text-[17px] font-semibold leading-snug lg:text-[19px]">Pay the driver</dd>
            <dd className="text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">In cash or by bank transfer</dd>
          </div>
          <HeroOffer welcome={welcome} />
        </dl>
      </div>
    </section>
  )
}
