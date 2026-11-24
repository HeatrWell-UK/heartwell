'use client'

// The admin's navigation (Run 4): a dark sidebar on desktop with labelled
// groups (Daily work, Website & business, Marketing, Shop, System) and a
// five-tab bar on phones (Home, Orders, Leads, Catalogue, More). Both read
// src/lib/admin/nav.ts, so every page appears exactly once.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartBarIcon,
  ChartLineUpIcon,
  ChatCircleTextIcon,
  CouchIcon,
  DotsThreeOutlineIcon,
  FlowArrowIcon,
  GearSixIcon,
  GlobeIcon,
  HouseIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MetaLogoIcon,
  PulseIcon,
  ReceiptIcon,
  SignOutIcon,
  StarIcon,
  VideoCameraIcon,
  type Icon,
} from '@phosphor-icons/react'
import { signOut } from '@/app/admin/actions'
import { cn } from '@/lib/cn'
import { activeHref, activePhoneTab, ADMIN_GROUPS, PHONE_TABS, type NavIconName } from '@/lib/admin/nav'

const NAV_ICONS: Record<NavIconName, Icon> = {
  house: HouseIcon,
  tasks: ListChecksIcon,
  orders: ReceiptIcon,
  leads: ChatCircleTextIcon,
  source: MagnifyingGlassIcon,
  website: GlobeIcon,
  business: ChartBarIcon,
  journeys: FlowArrowIcon,
  meta: MetaLogoIcon,
  tracking: ChartLineUpIcon,
  links: LinkSimpleIcon,
  catalogue: CouchIcon,
  reviews: StarIcon,
  videos: VideoCameraIcon,
  status: PulseIcon,
  settings: GearSixIcon,
  more: DotsThreeOutlineIcon,
}

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const active = activeHref(pathname)
  const phone = activePhoneTab(pathname)

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-[#140b0e] lg:flex print:hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-display text-xl font-bold tracking-tight text-white">
            Heartwell <span className="text-gold-pale">Admin</span>
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">{email}</p>
        </div>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-3">
          {ADMIN_GROUPS.map((g) => (
            <div key={g.key} className="mb-3">
              <p id={`nav-${g.key}`} className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                {g.label}
              </p>
              <ul aria-labelledby={`nav-${g.key}`} className="space-y-0.5">
                {g.items.map(({ href, label, icon }) => {
                  const on = active === href
                  const NavIcon = NAV_ICONS[icon]
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-gold-pale',
                          on ? 'bg-gold-pale/10 text-gold-pale' : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        {on && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold-pale" />}
                        <NavIcon aria-hidden="true" size={19} weight={on ? 'fill' : 'regular'} />
                        {label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <form action={signOut} className="border-t border-white/10 p-3">
          <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 font-medium text-red-300 transition-colors hover:bg-red-500/10">
            <SignOutIcon aria-hidden="true" size={19} />
            Sign out
          </button>
        </form>
      </aside>

      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#140b0e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {PHONE_TABS.map(({ href, label, icon }) => {
            const on = phone === href
            const NavIcon = NAV_ICONS[icon]
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined} className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1">
                <NavIcon aria-hidden="true" size={24} weight={on ? 'fill' : 'regular'} className={on ? 'text-gold-pale' : 'text-zinc-400'} />
                <span className={cn('truncate text-[11px] font-medium', on ? 'text-gold-pale' : 'text-zinc-400')}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
