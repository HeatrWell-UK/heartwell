import Image from 'next/image'
import { ButtonLink, buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { whatsAppHref } from '@/config/contact'

const HERO_IMAGE =
  'https://res.cloudinary.com/iv3tp2iq/image/upload/v1791033930/heartwell/samples/malibu-high-back-5-seater-corner-oatmeal-room.jpg'

/**
 * The home hero: a photo in the heart frame (an arched top with a centre
 * notch, echoing the logo's heart-backed sofa), the promise in one line, and
 * one main action. The frame is used here only.
 */
export function Hero() {
  const wa = whatsAppHref('Hi Heartwell, I have a question about your sofas.')
  return (
    <section className="mx-auto grid max-w-[1200px] gap-6 px-4 pt-4 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-6 lg:pt-10">
      <div className="relative aspect-[358/420] w-full overflow-hidden bg-stone [border-radius:50%_50%_24px_24px/28%_28%_24px_24px] lg:order-2">
        <Image
          src={HERO_IMAGE}
          alt="Malibu corner sofa in oatmeal in a bright living room with white panelled walls"
          fill
          priority
          fetchPriority="high"
          sizes="(min-width: 1024px) 560px, calc(100vw - 32px)"
          className="object-cover [object-position:50%_72%]"
        />
        <svg aria-hidden="true" viewBox="0 0 58 30" className="absolute left-1/2 top-[-1px] w-[16%] -translate-x-1/2">
          <path d="M0 0H58L29 30Z" fill="#FFFFFF" />
        </svg>
      </div>

      <div className="flex flex-col gap-4 lg:order-1">
        <h1 className="text-[36px] leading-[1.1] lg:text-[52px] lg:leading-[1.08]">Choose it today. Pay when it&rsquo;s home.</h1>
        <p className="text-[17px] leading-relaxed text-slate lg:text-lg">
          Free delivery across UK Mainland, usually within 2 to 4 working days. You pay the driver in cash or by bank transfer once
          your sofa is in the room.
        </p>
        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <ButtonLink href="/sofas" block className="sm:w-auto sm:min-w-56">
            Shop sofas
          </ButtonLink>
          {wa && (
            <a href={wa} className={buttonClasses({ variant: 'secondary', block: true, className: 'sm:w-auto' })}>
              <WhatsAppGlyph />
              Ask us on WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
