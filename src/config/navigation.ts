// Menu and footer links. The shop links come from the category tree (see
// getShopNavigation); SHOP_LINKS is only the fallback when the database can't
// be reached. Help and About links are the single list the menu and footer read.

import { CONTACT } from './contact'

export interface NavLink {
  label: string
  href: string
}

export const SHOP_LINKS: NavLink[] = [
  { label: 'Corner sofas', href: '/sofas/corner-sofas' },
  { label: 'U-shaped sofas', href: '/sofas/u-shaped-sofas' },
  { label: '3+2 sofa sets', href: '/sofas/3-2-sofa-sets' },
  { label: 'Fabric sofas', href: '/sofas/fabric-sofas' },
  { label: 'Leather sofas', href: '/sofas/leather-sofas' },
  { label: 'Recliners', href: '/sofas/recliners' },
  { label: 'All sofas', href: '/sofas' },
]

export const HELP_LINKS: NavLink[] = [
  { label: 'Saved sofas', href: '/saved' },
  { label: 'Delivery and returns', href: '/delivery-and-returns' },
  { label: 'Track my order', href: '/track-order' },
  { label: 'Fabric samples', href: '/fabric-samples' },
  { label: 'Will it fit?', href: '/will-it-fit' },
  { label: 'Contact us', href: '/contact' },
]

/** Browse links shown under the shop links. */
export const BROWSE_LINKS: NavLink[] = [
  { label: 'Shop by range', href: '/ranges' },
  { label: 'Our fabrics', href: '/fabrics' },
]

export const ABOUT_LINKS: NavLink[] = [
  { label: 'About Heartwell', href: '/about' },
  // Only once there's an address to visit.
  ...(CONTACT.visitAddress ? [{ label: 'Visit us', href: '/visit-us' }] : []),
  { label: 'Reviews', href: '/reviews' },
  { label: 'Guides', href: '/guides' },
]

export const LEGAL_LINKS: NavLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
]
