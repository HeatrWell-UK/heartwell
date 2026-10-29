import { CalendarCheckIcon, HandCoinsIcon } from '@phosphor-icons/react/ssr'
import { AlcoveFloor, Arcade, Medallion } from '@/components/catalogue/Arcade'
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

// The photo is square and cropped to the 5:6 arch (object-fit: cover), so it's shown a little wider than its alcove.
const ROOM_SIZES = '(min-width: 1680px) 454px, (min-width: 1024px) 27vw, (min-width: 640px) 44vw, 92vw'

export function Hero({ ranges, windowLabel, welcome }: { ranges: RangeSummary[]; windowLabel: string | null; welcome: WelcomeSettings }) {
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

      <Arcade
        main={{ src: ROOM, alt: ROOM_ALT, sizes: ROOM_SIZES }}
        side={ranges.slice(0, 4).map((r) => ({ key: r.slug, href: `/ranges/${r.slug}`, image: r.image, title: r.name, detail: `from ${formatPrice(r.price)}` }))}
        sideLabel="Some of our ranges"
        className="mt-6 sm:mt-8 lg:mt-7"
      >
        <Medallion label="To pay today" value="£0" />
        <AlcoveFloor>
          <ButtonLink href="/sofas" className="px-9 shadow-[0_10px_24px_-10px_rgb(40_8_14/0.8)]">
            Shop sofas
          </ButtonLink>
        </AlcoveFloor>
      </Arcade>

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
