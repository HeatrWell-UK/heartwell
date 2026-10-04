import Link from 'next/link'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { LogoLockup } from '@/components/brand/Logo'
import { MenuDrawer } from './MenuDrawer'
import { BasketLink } from './BasketLink'

const iconButton = 'flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone'

/**
 * Menu on the left, the logo in the middle, search and basket on the right.
 * The basket shows how many items are in it on this device; search arrives
 * with the catalogue pages (Phase 9).
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
          <BasketLink className={iconButton} />
        </div>
      </div>
    </header>
  )
}
