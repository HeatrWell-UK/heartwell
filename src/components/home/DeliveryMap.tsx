import { CalendarCheckIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react/ssr'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { PostcodeCheck } from '@/components/product/PostcodeCheck'
import { PROMISES } from '@/config/promises'
import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import Link from 'next/link'
import { chargeRange } from '@/lib/delivery/areas'
import { deliveryDaysText } from '@/lib/delivery/window'
import type { DeliveryInfo } from '@/lib/product/types'
import { appleMapsHref, directionsHref } from './VisitUs'
import { BritainMap } from '@/components/content/BritainMap'

/**
 * Where we deliver, drawn: mainland Britain with the Burnley showroom marked,
 * the instant postcode check beside it, and how to visit. The map is the area
 * the online checkout takes (src/lib/delivery/postcode.ts); a few parts of it
 * pay a delivery charge (delivery_areas).
 */
export function DeliveryMap({ delivery }: { delivery: DeliveryInfo | null }) {
  const a = CONTACT.visitAddress
  const charges = delivery ? chargeRange(delivery.areas) : ''
  return (
    <section
      aria-labelledby="delivery"
      className="mx-auto grid max-w-[1200px] gap-8 px-4 pt-14 lg:grid-cols-[5fr_6fr] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8 lg:px-6 lg:pt-24"
    >
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <h2 id="delivery" className="text-[30px] leading-tight lg:text-[42px]">
          Free delivery to most of mainland Britain
        </h2>
        <p className="text-[17px] leading-relaxed text-slate">
          Usually in {PROMISES.delivery.timingShort}, into the room of your choice on the ground floor.{' '}
          {charges && (
            <>
              {PROMISES.delivery.chargedAreas} pay {charges} and take {PROMISES.delivery.chargedTiming} (
              <Link href="/delivery-and-returns#areas" className="underline">
                see the areas
              </Link>
              ).{' '}
            </>
          )}
          Northern Ireland and the islands are delivered by arrangement. {delivery ? deliveryDaysText(delivery.noDeliveryDays) : ''}
        </p>
      </div>

      <BritainMap className="mx-auto w-[64%] max-w-[300px] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-full lg:max-w-[330px] lg:self-center" />

      <div className="flex flex-col gap-8 lg:col-start-2 lg:row-start-2">
        {delivery && <PostcodeCheck delivery={delivery} noDeliveryDays={delivery.noDeliveryDays} className="" />}

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
