import type { Metadata } from 'next'
import Link from 'next/link'
import { EnvelopeSimpleIcon, MapPinIcon, PhoneIcon } from '@phosphor-icons/react/ssr'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { buttonClasses } from '@/components/ui/Button'
import { CONTACT, phoneHref, visitBookingText, visitHoursText } from '@/config/contact'
import { ContactForm } from './ContactForm'
import { TelLink } from '@/components/tracking/TelLink'

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Ask Heartwell about sofas, fabrics, delivery or an order: WhatsApp, phone, email or the form.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  const tel = phoneHref()
  const a = CONTACT.visitAddress
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-16 pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16 lg:px-6 lg:pb-24 lg:pt-12">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          <h1 className="text-[38px] leading-[1.06] lg:text-[56px]">Contact us</h1>
          <p className="text-[17px] leading-relaxed text-slate">Questions about a sofa, a fabric, delivery or your order? WhatsApp is quickest, or send us a message below.</p>
        </header>
        <div className="flex flex-col gap-3">
          <WhatsAppButton message="Hi Heartwell, I have a question." context="contact" className={buttonClasses({ variant: 'secondary', block: true })}>
            <WhatsAppGlyph />
            Message us on WhatsApp
          </WhatsAppButton>
          {tel && CONTACT.phoneDisplay && (
            <TelLink href={tel} className="flex min-h-11 items-center gap-3 text-[17px] font-semibold">
              <PhoneIcon aria-hidden="true" size={24} className="text-velvet" />
              {CONTACT.phoneDisplay}
            </TelLink>
          )}
          <a href={`mailto:${CONTACT.email}`} className="flex min-h-11 items-center gap-3 text-[17px] font-semibold">
            <EnvelopeSimpleIcon aria-hidden="true" size={24} className="text-velvet" />
            {CONTACT.email}
          </a>
        </div>
        {a && (
          <section aria-labelledby="visit" className="hw-panel flex flex-col gap-1.5 px-5 py-5 text-[16px] leading-relaxed">
            <h2 id="visit" className="flex items-center gap-2 font-sans text-[17px] font-bold tracking-normal">
              <MapPinIcon aria-hidden="true" size={22} className="text-velvet" />
              Visit us
            </h2>
            <address className="not-italic">
              {a.street}, {a.locality} {a.postcode}
            </address>
            <p className="text-slate">
              {visitHoursText()}. {visitBookingText()}
            </p>
            <Link href="/visit-us" className="self-start font-semibold">
              How to visit
            </Link>
          </section>
        )}
      </div>
      <section aria-labelledby="form-title" className="flex flex-col gap-4">
        <h2 id="form-title" className="text-[28px] leading-tight lg:text-[34px]">
          Send us a message
        </h2>
        <ContactForm />
      </section>
    </div>
  )
}
