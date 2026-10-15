import { getImageProps } from 'next/image'
import { ButtonLink, buttonClasses } from '@/components/ui/Button'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { PROMISES } from '@/config/promises'

/**
 * The owner's hero photo (Cloudinary, heartwell/Product Images/Elements): a sofa
 * in the velvet alcove every product is photographed in. Phones show the
 * square original; wider screens show the same room widened to 2:1 with
 * Cloudinary's generative fill (`home-hero-wide`, made once and stored, so it
 * is never generated again).
 *
 * The headline is set inside the photo's alcove and the button stands on the
 * floor. Their positions in globals.css (.hw-hero) are measured from these two
 * photos: a different photo needs its alcove measured again.
 */
const SQUARE = { src: 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792009391/Main-Hero-Background-Image.jpg', width: 1254, height: 1254 }
const WIDE = { src: 'https://res.cloudinary.com/iv3tp2iq/image/upload/v1792082949/home-hero-wide.jpg', width: 2508, height: 1254 }
const ALT = 'A grey sofa with cream cushions in a red velvet alcove, in a panelled room with a herringbone oak floor'

export function Hero() {
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
        <h1 id="hero-title" className="hw-hero-title">
          <span className="text-gold-lit block">Choose it today.</span> <span className="text-gold-lit block">Pay when it&rsquo;s home.</span>
        </h1>
        <div className="hw-hero-floor">
          <ButtonLink href="/sofas" className="px-9 shadow-[0_10px_24px_-10px_rgb(40_8_14/0.7)]">
            Shop sofas
          </ButtonLink>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-6 lg:pt-7">
        <p className="max-w-[40rem] text-[17px] leading-relaxed text-slate lg:text-lg">
          {PROMISES.delivery.short}, usually in {PROMISES.delivery.timingShort}. You pay the driver in cash or by bank transfer once it&rsquo;s in
          your room.
        </p>
        <WhatsAppButton
          message="Hi Heartwell, I have a question about your sofas."
          context="home"
          className={buttonClasses({ variant: 'secondary', block: true, className: 'shrink-0 sm:w-auto sm:self-start lg:self-auto' })}
        >
          <WhatsAppGlyph />
          Ask us on WhatsApp
        </WhatsAppButton>
      </div>
    </section>
  )
}
