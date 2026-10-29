'use client'

import { HeartIcon, HandCoinsIcon } from '@phosphor-icons/react'
import { formatPrice } from '@/lib/format'
import { timeLeftText, type WelcomeSettings } from '@/lib/offers/welcome'
import { useWelcome } from '@/components/offer/WelcomeOffer'

/**
 * The hero strip's third fact: this visitor's welcome offer and its real time
 * left (the database's end time; it never restarts), or, once it has ended or
 * when the shop has it off, how paying works. The same height either way, so
 * the page doesn't move when the offer arrives.
 */
export function HeroOffer({ welcome }: { welcome: WelcomeSettings }) {
  const state = useWelcome(welcome.enabled)
  if (state.kind === 'none') {
    return (
      <div className="col-span-2 flex flex-col gap-1 border-t border-white/15 pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
        <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
          <HandCoinsIcon aria-hidden="true" size={16} className="shrink-0 text-gold-pale" />
          On delivery
        </dt>
        <dd className="text-[17px] font-semibold leading-snug lg:text-[19px]">Pay the driver</dd>
        <dd className="text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">In cash or by bank transfer</dd>
      </div>
    )
  }
  const left = state.kind === 'live' ? state.left : null
  return (
    <div className="col-span-2 flex flex-col gap-1 border-t border-white/15 pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
      <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
        <HeartIcon aria-hidden="true" size={16} weight="fill" className="shrink-0 text-gold-pale" />
        Your welcome offer
      </dt>
      <dd className="text-[17px] font-semibold leading-snug lg:text-[19px]">{formatPrice(welcome.amount)} off every piece</dd>
      <dd className="text-[13px] leading-snug text-on-wine-muted tabular-nums lg:text-[14px]">
        {left ? (
          <>
            <span aria-hidden="true">
              {left.hours > 0 ? `${left.hours} h ` : ''}
              {left.minutes} min left
            </span>
            <span className="sr-only">Ends in {timeLeftText(left)}</span>
          </>
        ) : (
          `Taken off at checkout, for ${welcome.hours} hours`
        )}
      </dd>
    </div>
  )
}
