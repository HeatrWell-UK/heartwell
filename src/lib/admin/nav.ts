// The admin's navigation in one place (Run 4): the desktop sidebar's groups,
// the phone tab bar and the More page all read this list, so every page
// appears exactly once and the selected item is the same everywhere. Pure.

export type NavIconName =
  | 'house'
  | 'tasks'
  | 'orders'
  | 'leads'
  | 'source'
  | 'website'
  | 'business'
  | 'journeys'
  | 'meta'
  | 'tracking'
  | 'links'
  | 'catalogue'
  | 'reviews'
  | 'videos'
  | 'status'
  | 'settings'
  | 'more'

export interface NavItem {
  href: string
  label: string
  /** One line on the More page. */
  note: string
  icon: NavIconName
}

export interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

export const ADMIN_GROUPS: NavGroup[] = [
  {
    key: 'daily',
    label: 'Daily work',
    items: [
      { href: '/admin', label: 'Home', note: 'Today’s numbers at a glance', icon: 'house' },
      { href: '/admin/today', label: 'Today', note: 'What to do now, most urgent first', icon: 'tasks' },
      { href: '/admin/workstation', label: 'Workstation', note: 'Every open task, grouped and filterable', icon: 'tasks' },
      { href: '/admin/orders', label: 'Orders', note: 'All orders', icon: 'orders' },
      { href: '/admin/leads', label: 'Leads', note: 'WhatsApp, samples, basket reminders, messages', icon: 'leads' },
      { href: '/admin/source-review', label: 'Source review', note: 'Orders with no known source', icon: 'source' },
    ],
  },
  {
    key: 'insights',
    label: 'Website & business',
    items: [
      { href: '/admin/website', label: 'Website', note: 'Visits, baskets, WhatsApp and orders', icon: 'website' },
      { href: '/admin/business', label: 'Business', note: 'Orders and value by status', icon: 'business' },
      { href: '/admin/journeys', label: 'Journeys', note: 'Funnel, fields that fail, where visits stop', icon: 'journeys' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    items: [
      { href: '/admin/meta', label: 'Meta signals', note: 'Purchase and delivery events: sent, held, skipped', icon: 'meta' },
      { href: '/admin/tracking', label: 'Tracking & GA4', note: 'Tracking mode, GA4 and the send queue', icon: 'tracking' },
      { href: '/admin/ad-links', label: 'Ad links', note: 'Catalogue feed and links for your ads', icon: 'links' },
    ],
  },
  {
    key: 'shop',
    label: 'Shop',
    items: [
      { href: '/admin/catalogue', label: 'Catalogue', note: 'Products, prices, photos and fabrics', icon: 'catalogue' },
      { href: '/admin/reviews', label: 'Reviews', note: 'Waiting for approval', icon: 'reviews' },
      { href: '/admin/videos', label: 'Videos', note: 'On product pages', icon: 'videos' },
    ],
  },
  {
    key: 'system',
    label: 'System',
    items: [
      { href: '/admin/status', label: 'Status', note: 'Is everything working?', icon: 'status' },
      { href: '/admin/settings', label: 'Settings', note: 'Delivery, offers, season, samples', icon: 'settings' },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = ADMIN_GROUPS.flatMap((g) => g.items)

/** Phones: five tabs; everything else is on More. */
export const PHONE_TABS: NavItem[] = [
  ALL_NAV_ITEMS.find((i) => i.href === '/admin')!,
  ALL_NAV_ITEMS.find((i) => i.href === '/admin/orders')!,
  ALL_NAV_ITEMS.find((i) => i.href === '/admin/leads')!,
  ALL_NAV_ITEMS.find((i) => i.href === '/admin/catalogue')!,
  { href: '/admin/more', label: 'More', note: '', icon: 'more' },
]

/** The More page lists every group except the pages already on the tab bar. */
export const MORE_GROUPS: NavGroup[] = ADMIN_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !PHONE_TABS.some((t) => t.href === i.href)) })).filter((g) => g.items.length > 0)

/** The item a path belongs to: the longest matching href (so /admin/orders/x selects Orders, /admin selects only Home). */
export function activeHref(pathname: string): string | null {
  let best: string | null = null
  for (const { href } of ALL_NAV_ITEMS) {
    const hit = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
    if (hit && (!best || href.length > best.length)) best = href
  }
  return best
}

/** On phones, the tab that is selected: its own tab, or More for everything else. */
export function activePhoneTab(pathname: string): string {
  const href = activeHref(pathname)
  if (href && PHONE_TABS.some((t) => t.href === href)) return href
  return '/admin/more'
}
