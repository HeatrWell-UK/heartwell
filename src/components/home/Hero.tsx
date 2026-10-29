import { getImageProps } from 'next/image'
import { CalendarCheckIcon } from '@phosphor-icons/react/ssr'
import { ButtonLink } from '@/components/ui/Button'
import { PROMISES } from '@/config/promises'
import type { WelcomeSettings } from '@/lib/offers/welcome'
import { HeroOffer } from './HeroOffer'

/**
 * The owner's hero photo (Cloudinary, heartwell/Product Images/Elements): a sofa
 * in the velvet alcove every product is photographed in. Phones show the
 * square original; wider screens show the same room widened to 2:1 with
 * Cloudinary's generative fill (`home-hero-wide`, made once and stored, so it
 * is never generated again).
 *
 * The headline is set inside the photo's alcove and the button stands on the
 * floor. Their positions in globals.css (.hw-hero) are measured from these two
 * photos: a different photo needs its alcove measured again. As the page opens
 * the alcove lights up once (globals.css, "Motion").
 *
 * Under it, the strip says what's true today: nothing to pay now, the real
 * delivery dates for an order placed today, and the visitor's welcome offer
 * with its real time left.
 */
const SQUARE = { src: 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792009391/Main-Hero-Background-Image.jpg', width: 1254, height: 1254 }
const WIDE = { src: 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792082949/home-hero-wide.jpg', width: 2508, height: 1254 }
const ALT = 'A grey sofa with cream cushions in a red velvet alcove, in a panelled room with a herringbone oak floor'

export function Hero({ windowLabel, welcome }: { windowLabel: string | null; welcome: WelcomeSettings }) {
  // The photo is cropped to the frame (object-fit: cover), so each source is shown wider than the screen.
  const common = { alt: ALT, loading: 'eager', fetchPriority: 'high' } as const
  const { props: wide } = getImageProps({ ...common, ...WIDE, sizes: '(min-width: 1024px) min(100vw, 1920px), 150vw' })
  const { props: square } = getImageProps({ ...common, ...SQUARE, sizes: '115vw' })

  return (
    <section aria-labelledby="hero-title">
      <div className="hw-hero">
        <picture>
          <source media="(min-width: 640px)" srcSet={wide.srcSet} sizes={wide.sizes} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- the art-directed <picture> from Next's docs; alt is in the props */}
          <img {...square} />
        </picture>
        <span aria-hidden="true" className="hw-hero-glow" />
        <h1 id="hero-title" className="hw-hero-title">
          <span className="text-gold-lit block">Choose it today.</span> <span className="text-gold-lit block">Pay when it&rsquo;s home.</span>
        </h1>
        <div className="hw-hero-floor">
          <ButtonLink href="/sofas" className="px-9 shadow-[0_10px_24px_-10px_rgb(40_8_14/0.7)]">
            Shop sofas
          </ButtonLink>
        </div>
      </div>

      {/* Today, in three facts: a plinth in the alcove's velvet under the photo's oak floor. */}
      <div className="bg-wine text-white">
        <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-4 gap-y-4 px-4 py-5 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-x-12 lg:px-6 lg:py-6">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">To pay today</dt>
            <dd className="text-gold-lit font-display text-[34px] leading-none lg:text-[40px]">£0</dd>
          </div>
          <div className="flex flex-col gap-1 border-l border-white/15 pl-4 lg:pl-12">
            <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
              <CalendarCheckIcon aria-hidden="true" size={16} className="shrink-0 text-gold-pale" />
              {windowLabel ? 'Order today, at your door' : 'Delivery'}
            </dt>
            <dd className="text-[17px] font-semibold leading-snug lg:text-[19px]">{windowLabel ?? `Usually ${PROMISES.delivery.timingShort}`}</dd>
            <dd className="text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">{PROMISES.delivery.short}</dd>
          </div>
          <HeroOffer welcome={welcome} />
        </dl>
      </div>
    </section>
  )
}
