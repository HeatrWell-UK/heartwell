import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'onWine' | 'onWineOutline'
export type ButtonSize = 'md' | 'sm'

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-full font-semibold transition-[filter,background-color,color] duration-150 select-none disabled:cursor-not-allowed'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-velvet-sheen text-white hover:brightness-110 active:brightness-95 disabled:bg-none disabled:bg-line-soft disabled:text-slate',
  secondary: 'border-[1.5px] border-velvet text-velvet bg-transparent hover:bg-gold-cream-tint disabled:border-line disabled:text-slate',
  gold: 'bg-gold-sheen text-wine font-bold hover:brightness-105 active:brightness-95',
  onWine: 'bg-white text-wine hover:bg-on-wine',
  onWineOutline: 'border-[1.5px] border-white text-white bg-transparent hover:bg-white/10',
}

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-14 px-6 text-[17px] lg:min-h-12',
  sm: 'min-h-11 px-5 text-[15px]',
}

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to the width of its container (the default on phones for main actions). */
  block?: boolean
  className?: string
  children: ReactNode
}

export function buttonClasses({ variant = 'primary', size = 'md', block = false, className }: Omit<CommonProps, 'children'>) {
  return cn(base, variants[variant], sizes[size], block && 'w-full', className)
}

export function Button({ variant, size, block, className, children, ...rest }: CommonProps & ComponentProps<'button'>) {
  return (
    <button type="button" className={buttonClasses({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, block, className, children, ...rest }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses({ variant, size, block, className })} {...rest}>
      {children}
    </Link>
  )
}
