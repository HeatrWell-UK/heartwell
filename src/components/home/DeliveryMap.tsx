import { CalendarCheckIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react/ssr'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { PostcodeCheck } from '@/components/product/PostcodeCheck'
import { PROMISES } from '@/config/promises'
import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import { appleMapsHref, directionsHref } from './VisitUs'
import { BRITAIN } from './britain-outline'

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`
const [, , MAP_W, MAP_H] = BRITAIN.viewBox.split(' ').map(Number) as [number, number, number, number]

/** A heart, like the logo's, centred on 0,0. */
const HEART = 'M0 -2.6C-1.6 -6.4 -7.6 -6.2 -7.6 -1.4C-7.6 2.6 -2.4 5.6 0 7.6C2.4 5.6 7.6 2.6 7.6 -1.4C7.6 -6.2 1.6 -6.4 0 -2.6Z'

/**
 * Where we deliver free, drawn: mainland Britain with the Burnley showroom
 * marked, the instant postcode check beside it, and how to visit. The map is
 * the same area the checkout calls UK Mainland (src/lib/delivery/postcode.ts).
 */
export function DeliveryMap({ windowLabel }: { windowLabel: string | null }) {
  const a = CONTACT.visitAddress
  return (
    <section
      aria-labelledby="delivery"
      className="mx-auto grid max-w-[1200px] gap-8 px-4 pt-14 lg:grid-cols-[5fr_6fr] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8 lg:px-6 lg:pt-24"
    >
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <h2 id="delivery" className="text-[30px] leading-tight lg:text-[42px]">
          Free delivery across mainland Britain
        </h2>
        <p className="text-[17px] leading-relaxed text-slate">
          Usually in {PROMISES.delivery.timingShort}, into the room of your choice on the ground floor. Northern Ireland and the islands are
          delivered by arrangement.
        </p>
      </div>

      <figure className="relative mx-auto w-[64%] max-w-[300px] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-full lg:max-w-[330px] lg:self-center">
        <svg viewBox={BRITAIN.viewBox} className="block h-auto w-full overflow-visible" role="img" aria-labelledby="delivery-map-caption">
          <defs>
            <linearGradient id="map-heart-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#94701F" />
              <stop offset="0.4" stopColor="#E9CC7B" />
              <stop offset="0.7" stopColor="#B58A2F" />
              <stop offset="1" stopColor="#F2DC9C" />
            </linearGradient>
          </defs>
          <path d={BRITAIN.path} fill="#F5F1EF" stroke="#8E1B2E" strokeWidth="1.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {a && (
            <g transform={`translate(${BRITAIN.burnley.x} ${BRITAIN.burnley.y})`}>
              <circle r="11" fill="#8E1B2E" opacity="0.12" />
              <path d={HEART} fill="url(#map-heart-gold)" stroke="#4A0D17" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
        {a && (
          <span
            aria-hidden="true"
            className="absolute whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold leading-none text-velvet ring-1 ring-line"
            style={{ left: pct(BRITAIN.burnley.x, MAP_W), top: pct(BRITAIN.burnley.y, MAP_H), transform: 'translate(16px, -50%)' }}
          >
            {a.locality} showroom
          </span>
        )}
        <figcaption id="delivery-map-caption" className="sr-only">
          Map of mainland Great Britain, where delivery is free{a ? `, with our showroom in ${a.locality} marked` : ''}.
        </figcaption>
      </figure>

      <div className="flex flex-col gap-8 lg:col-start-2 lg:row-start-2">
        {windowLabel && <PostcodeCheck windowLabel={windowLabel} className="" />}

        {a && (
          <div className="flex flex-col gap-4 border-t border-line pt-7">
            <h3 className="text-[24px] leading-tight lg:text-[28px]">See them first in {a.locality}</h3>
            <p className="text-[16px] leading-relaxed text-slate">
              Sit on the sofas and feel the fabrics before you choose. Visits are by appointment, so someone is there to show you round.
            </p>
            <ul className="flex flex-col gap-2.5 text-[16px] leading-snug">
              <li className="flex items-start gap-3">
                <MapPinIcon aria-hidden="true" size={22} className="mt-px shrink-0 text-velvet" />
                <address className="font-semibold not-italic">
                  {a.street}, {a.locality}, <span className="whitespace-nowrap">{a.postcode}</span>
                </address>
              </li>
              <li className="flex items-start gap-3">
                <ClockIcon aria-hidden="true" size={22} className="mt-px shrink-0 text-velvet" />
                <span>
                  <span className="sr-only">Opening hours: </span>
                  {visitHoursText()}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CalendarCheckIcon aria-hidden="true" size={22} className="mt-px shrink-0 text-velvet" />
                <span>{visitBookingText()}</span>
              </li>
            </ul>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-6">
              <WhatsAppButton
                message={`Hi Heartwell, I’d like to book a visit to ${a.street}, ${a.locality}. The day and time that suit me: `}
                context="visit"
                className={buttonClasses({ variant: 'secondary', block: true, className: 'sm:w-auto' })}
              >
                <WhatsAppGlyph />
                Book a visit on WhatsApp
              </WhatsAppButton>
              <p className="flex flex-wrap gap-x-4 gap-y-2 text-[15px]">
                <span className="text-slate">Directions:</span>
                <a href={directionsHref(a)} className="font-semibold">
                  Google Maps
                </a>
                <a href={appleMapsHref(a)} className="font-semibold">
                  Apple Maps
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
