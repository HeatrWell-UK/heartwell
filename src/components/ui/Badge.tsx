import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'gold' | 'white' | 'outline' | 'offer'

const tones: Record<Tone, string> = {
  gold: 'bg-gold-tint text-velvet',
  white: 'bg-white text-velvet',
  outline: 'bg-white text-velvet border border-line',
  offer: 'bg-gold-pale text-wine font-bold',
}

export function Badge({ tone = 'gold', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none', tones[tone], className)}>
      {children}
    </span>
  )
}
