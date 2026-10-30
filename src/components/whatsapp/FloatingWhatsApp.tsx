'use client'

// The WhatsApp button that stays on screen on every shop page (owner, 24
// October 2026), with a first message that fits the page: the product and
// colour, the range or category, the pieces in the basket, the order. It goes
// through WhatsAppButton, so each chat gets its HW-WA reference, is saved as an
// enquiry and opens WhatsApp properly from the Facebook and Instagram apps.
//
// A velvet circle with a gold rim and the WhatsApp mark (green only in the
// mark, as everywhere on the site); on wide screens it says what it does. It
// rides above whatever is fixed to the bottom of the screen (the cookie
// question) through --hw-cover-bottom, and sits inside #page, so the menu and
// sheets cover it and make it inert. On a product page the buy bar carries
// WhatsApp itself, so this one steps aside there (globals.css, [data-buy-bar]).

import { usePathname } from 'next/navigation'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { CONTACT } from '@/config/contact'
import { SITE_URL } from '@/config/site'
import { useBasket } from '@/lib/basket/store'
import { useHydrated } from '@/lib/basket/use-hydrated'
import { pageTopic } from '@/lib/whatsapp/page-message'
import { usePageTopic } from './WhatsAppTopic'

/** Pages where a chat button would only get in the way. */
const HIDDEN = new Set(['/login'])

export function FloatingWhatsApp() {
  const pathname = usePathname()
  const set = usePageTopic(pathname)
  const basket = useBasket()
  const hydrated = useHydrated()
  if (!CONTACT.whatsAppNumber || HIDDEN.has(pathname)) return null

  const topic =
    set ??
    pageTopic(pathname, {
      siteUrl: SITE_URL,
      // The basket lives on the device, so it's only known once the page is running.
      basket: hydrated ? basket.lines.map((l) => ({ title: l.view.title, option: l.view.option, quantity: l.quantity })) : [],
      town: CONTACT.visitAddress?.locality ?? null,
    })

  return (
    <div
      data-floating-whatsapp=""
      className="pointer-events-none fixed right-4 z-30 print:hidden lg:right-6"
      style={{ bottom: 'max(calc(16px + env(safe-area-inset-bottom)), calc(var(--hw-cover-bottom, 0px) + 12px))' }}
    >
      <WhatsAppButton
        {...topic}
        className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-velvet-sheen text-white no-underline shadow-[inset_0_0_0_1.5px_rgba(233,204,123,.75),0_8px_22px_rgba(58,10,18,.32)] hover:text-white hover:brightness-110 focus-visible:outline-offset-4 lg:size-auto lg:min-h-14 lg:gap-2.5 lg:pl-3 lg:pr-5"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white">
          <WhatsAppGlyph size={28} />
        </span>
        <span className="sr-only lg:not-sr-only lg:text-[15px] lg:font-semibold">Ask us on WhatsApp</span>
      </WhatsAppButton>
    </div>
  )
}
