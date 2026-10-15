import { CalendarCheckIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react/ssr'
import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { TelLink } from '@/components/tracking/TelLink'
import { CONTACT, phoneHref, visitBookingText, visitHoursText, type VisitAddress } from '@/config/contact'

export const addressLine = (a: VisitAddress) => [a.street, a.locality, a.postcode].join(', ')

export function directionsHref(a: VisitAddress): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine(a))}`
}

/** Apple Maps, which iPhones open in the Maps app. */
export function appleMapsHref(a: VisitAddress): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(addressLine(a))}`
}

/**
 * "Visit us": address, hours, how to book and directions. Shown only once a
 * real address is set in src/config/contact.ts; until then it isn't rendered
 * at all, never as a placeholder.
 */
export function VisitUs({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const a = CONTACT.visitAddress
  if (!a) return null
  const Heading = headingLevel
  const tel = phoneHref()
  return (
    <section aria-labelledby="visit-us" className="flex flex-col gap-4">
      <Heading id="visit-us" className={headingLevel === 'h1' ? 'text-[38px] leading-[1.06] lg:text-[56px]' : 'text-[28px] leading-tight lg:text-[34px]'}>
        Visit us
      </Heading>
      <p className="text-[17px] leading-relaxed text-slate">
        See the sofas and feel the fabrics in person, in {a.locality}. Visits are by appointment, so someone is there to show you round.
      </p>
      <ul className="hw-panel flex flex-col gap-3 px-5 py-5 text-[16px] leading-relaxed">
        <li className="flex items-start gap-3">
          <MapPinIcon aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-velvet" />
          <address className="font-semibold not-italic">
            {a.street}, {a.locality}, <span className="whitespace-nowrap">{a.postcode}</span>
          </address>
        </li>
        <li className="flex items-start gap-3">
          <ClockIcon aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-velvet" />
          <span>
            <span className="sr-only">Opening hours: </span>
            {visitHoursText()}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <CalendarCheckIcon aria-hidden="true" size={24} className="mt-0.5 shrink-0 text-velvet" />
          <span>{visitBookingText()}</span>
        </li>
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <WhatsAppButton
          message={`Hi Heartwell, I’d like to book a visit to ${a.street}, ${a.locality}. The day and time that suit me: `}
          context="visit"
          className={buttonClasses({ variant: 'primary', block: true, className: 'sm:w-auto' })}
        >
          <WhatsAppGlyph />
          Book a visit on WhatsApp
        </WhatsAppButton>
        {tel && CONTACT.phoneDisplay && (
          <TelLink href={tel} className={buttonClasses({ variant: 'secondary', block: true, className: 'sm:w-auto' })}>
            Ring {CONTACT.phoneDisplay}
          </TelLink>
        )}
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-semibold">
        <a href={directionsHref(a)}>Directions in Google Maps</a>
        <a href={appleMapsHref(a)}>Directions in Apple Maps</a>
      </p>
    </section>
  )
}
