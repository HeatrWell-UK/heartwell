import Link from 'next/link'
import { BasketIcon, MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { LogoLockup } from '@/components/brand/Logo'
import { MenuDrawer } from './MenuDrawer'

const iconButton = 'flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone'

/**
 * Menu on the left, the logo in the middle, search and basket on the right.
 * Search and the basket count arrive with the catalogue and basket phases;
 * the links already point where they will live.
 */
export function Header() {
  return (
    <header className="border-b border-line-soft bg-white">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-2 lg:px-6">
        <MenuDrawer />
        <Link href="/" aria-label="Heartwell home" className="rounded-md">
          <LogoLockup />
        </Link>
        <div className="flex items-center">
          <Link href="/search" aria-label="Search" className={iconButton}>
            <MagnifyingGlassIcon aria-hidden="true" size={24} />
          </Link>
          <Link href="/basket" aria-label="Basket" className={iconButton}>
            <BasketIcon aria-hidden="true" size={24} />
          </Link>
        </div>
      </div>
    </header>
  )
}
