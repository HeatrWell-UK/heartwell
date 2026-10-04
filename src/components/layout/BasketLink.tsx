'use client'

import Link from 'next/link'
import { BasketIcon } from '@phosphor-icons/react'
import { useBasket } from '@/lib/basket/store'

/** The header basket, with how many items are in it on this device. */
export function BasketLink({ className }: { className: string }) {
  const { count } = useBasket()
  return (
    <Link href="/basket" aria-label={count ? `Basket, ${count} ${count === 1 ? 'item' : 'items'}` : 'Basket'} className={`relative ${className}`}>
      <BasketIcon aria-hidden="true" size={24} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-[3px] top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-velvet px-1 text-[11px] font-bold text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
