'use client'

import { cn } from '@/lib/cn'
import { eventPhase } from '@/lib/offers/event'
import { useSyncExternalStore } from 'react'
import { useSeasonSettings } from './SeasonContext'

const noop = () => () => {}

/** True while the season is on, in the browser (false on the server, so the hat never flashes wrongly). */
export function useSeasonOn(): boolean {
  const s = useSeasonSettings()
  return useSyncExternalStore(noop, () => Boolean(s && eventPhase(s)), () => false)
}

/** A small Santa hat, drawn in the shop's velvet and cream, for the logo and the WhatsApp button. Decorative only. */
export function SantaHat({ className }: { className?: string }) {
  const on = useSeasonOn()
  if (!on) return null
  return (
    <svg aria-hidden="true" viewBox="0 0 64 52" className={cn('pointer-events-none absolute', className)}>
      <path d="M8 40 C 14 18, 30 4, 50 8 C 56 10, 60 18, 58 28 C 52 20, 44 18, 40 22 C 36 28, 46 36, 52 40 Z" fill="#A3243A" />
      <path d="M8 40 C 14 22, 28 10, 44 10" fill="none" stroke="#7E1627" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      <rect x="4" y="38" width="52" height="11" rx="5.5" fill="#FBF4E6" stroke="#E9CC7B" strokeWidth="1" />
      <circle cx="57" cy="30" r="6" fill="#FBF4E6" stroke="#E9CC7B" strokeWidth="1" />
    </svg>
  )
}
