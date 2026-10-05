import { MapPinIcon } from '@phosphor-icons/react/ssr'
import { buttonClasses } from '@/components/ui/Button'
import { CONTACT, type VisitAddress } from '@/config/contact'

export const addressLine = (a: VisitAddress) => [a.street, a.locality, a.postcode].join(', ')

export function directionsHref(a: VisitAddress): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine(a))}`
}

/**
 * "Visit us": address, hours, how to visit and directions. Shown only once a
 * real address is set in src/config/contact.ts; until then it isn't rendered
 * at all, never as a placeholder.
 */
export function VisitUs({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const a = CONTACT.visitAddress
  if (!a) return null
  const Heading = headingLevel
  return (
    <section aria-labelledby="visit-us" className="flex flex-col gap-4">
      <Heading id="visit-us" className={headingLevel === 'h1' ? 'text-[32px] leading-tight lg:text-[44px]' : 'text-[28px] leading-tight lg:text-[34px]'}>
        Visit us
      </Heading>
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-stone p-5">
        <MapPinIcon aria-hidden="true" size={26} className="mt-0.5 shrink-0 text-velvet" />
        <address className="flex flex-col gap-1 text-[16px] not-italic leading-relaxed">
          <span className="font-semibold">{addressLine(a)}</span>
          {CONTACT.openingHours && <span className="text-slate">{CONTACT.openingHours}</span>}
        </address>
      </div>
      <a href={directionsHref(a)} className={buttonClasses({ variant: 'secondary', block: true, className: 'sm:w-auto' })}>
        Get directions
      </a>
    </section>
  )
}
