import Link from 'next/link'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { LogoLockup } from '@/components/brand/Logo'
import { MenuDrawer } from './MenuDrawer'
import { BasketLink } from './BasketLink'
import { NavLink } from './NavLink'
import { BROWSE_LINKS } from '@/config/navigation'
import type { NavSection } from '@/lib/catalogue/listing'

const iconButton = 'flex size-11 items-center justify-center rounded-full text-ink hover:bg-stone'

/**
 * Menu on the left, the logo in the middle, search and basket on the right.
 * The basket shows how many items are in it on this device. Desktops also get
 * the shop's categories and ranges in a row underneath, and "All sofas" once
 * there's room; everything else is in the menu.
 */
export function Header({ shop }: { shop: NavSection[] }) {
  const links = shop[0]?.links ?? []
  const ranges = BROWSE_LINKS[0]!
  const categories = links.slice(0, -1)
  const all = links.at(-1)
  return (
    <header className="border-b border-line-soft bg-white">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-2 lg:h-[68px] lg:px-6">
        <MenuDrawer shop={shop} />
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
      {categories.length > 0 && (
        <nav aria-label="Shop" className="hidden border-t border-line-soft lg:block">
          <ul className="mx-auto flex h-12 max-w-[1200px] items-center justify-center gap-6 whitespace-nowrap px-6 text-[15px] font-medium xl:gap-7">
            {categories.map((l) => (
              <li key={l.href}>
                <NavLink href={l.href}>{l.label}</NavLink>
              </li>
            ))}
            <li>
              <NavLink href={ranges.href}>Ranges</NavLink>
            </li>
            {all && (
              <li className="hidden xl:block">
                <NavLink href={all.href} exact className="font-semibold text-velvet">
                  {all.label}
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}
