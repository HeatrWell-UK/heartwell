// Menu and footer links. Category links become database-driven in Phase 9;
// until then this is the single list both the menu and the footer read.

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
  { label: 'Delivery and returns', href: '/delivery-and-returns' },
  { label: 'Track my order', href: '/track-order' },
  { label: 'Fabric samples', href: '/fabric-samples' },
  { label: 'Will it fit?', href: '/will-it-fit' },
  { label: 'Contact us', href: '/contact' },
]

export const ABOUT_LINKS: NavLink[] = [
  { label: 'About Heartwell', href: '/about' },
  { label: 'Visit us', href: '/visit-us' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Guides', href: '/guides' },
]

export const LEGAL_LINKS: NavLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
]
