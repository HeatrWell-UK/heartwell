'use client'

import { HeartIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import { timeLeftText, type WelcomeSettings } from '@/lib/offers/welcome'
import { useWelcome } from '@/components/offer/WelcomeOffer'

const FRAME = 'col-span-2 flex flex-col gap-1 border-t border-white/15 pt-4 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0'

/**
 * The hero's third fact: this visitor's welcome offer and its real time left
 * (the database's end time; it never restarts), or, once it has ended or when
 * the shop has it off, the guarantee. The same height either way, so the page
 * doesn't move when the offer arrives.
 */
export function HeroOffer({ welcome }: { welcome: WelcomeSettings }) {
  const state = useWelcome(welcome.enabled)
  if (state.kind === 'none') {
    return (
      <div className={FRAME}>
        <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
          <ShieldCheckIcon aria-hidden="true" size={17} className="shrink-0 text-gold-pale" />
          Every sofa
        </dt>
        <dd className="text-[17px] font-semibold leading-snug lg:text-[19px]">{PROMISES.guarantee.label}</dd>
        <dd className="text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">On the frame and springs</dd>
      </div>
    )
  }
  const left = state.kind === 'live' ? state.left : null
  return (
    <div className={FRAME}>
      <dt className="flex items-center gap-1.5 text-[13px] leading-snug text-on-wine-muted lg:text-[14px]">
        <HeartIcon aria-hidden="true" size={17} weight="fill" className="shrink-0 text-gold-pale" />
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
