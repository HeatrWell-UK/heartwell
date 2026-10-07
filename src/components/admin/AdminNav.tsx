'use client'

// The admin's navigation, laid out like the sister shop's admin: a dark
// sidebar on desktop and a bottom tab bar on phones, in Heartwell's colours.
// Each phase adds its pages here.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChatCircleTextIcon,
  CouchIcon,
  DotsThreeOutlineIcon,
  GearSixIcon,
  HouseIcon,
  PulseIcon,
  ReceiptIcon,
  SignOutIcon,
  StarIcon,
  VideoCameraIcon,
  type Icon,
} from '@phosphor-icons/react'
import { signOut } from '@/app/admin/actions'
import { cn } from '@/lib/cn'

// Phones get five tabs; the rest (and Sign out) live on the More page.
const NAV: { href: string; label: string; icon: Icon; phone?: false; desktop?: false }[] = [
  { href: '/admin', label: 'Home', icon: HouseIcon },
  { href: '/admin/orders', label: 'Orders', icon: ReceiptIcon },
  { href: '/admin/leads', label: 'Leads', icon: ChatCircleTextIcon },
  { href: '/admin/reviews', label: 'Reviews', icon: StarIcon, phone: false },
  { href: '/admin/catalogue', label: 'Catalogue', icon: CouchIcon },
  { href: '/admin/videos', label: 'Videos', icon: VideoCameraIcon, phone: false },
  { href: '/admin/settings', label: 'Settings', icon: GearSixIcon, phone: false },
  { href: '/admin/status', label: 'Status', icon: PulseIcon, phone: false },
  { href: '/admin/more', label: 'More', icon: DotsThreeOutlineIcon, desktop: false },
]

/** The sections the More tab stands for on phones. */
const MORE_PAGES = ['/admin/more', '/admin/reviews', '/admin/videos', '/admin/settings', '/admin/status']

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href
  if (href === '/admin/more') return MORE_PAGES.some((p) => pathname.startsWith(p))
  return pathname.startsWith(href)
}

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-[#140b0e] lg:flex print:hidden">
        <div className="border-b border-white/10 p-6">
          <p className="font-display text-xl font-bold tracking-tight text-white">
            Heartwell <span className="text-gold-pale">Admin</span>
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">{email}</p>
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV.filter((n) => n.desktop !== false).map(({ href, label, icon: NavIcon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-4 py-2.5 font-medium transition-colors',
                  active ? 'bg-gold-pale/10 text-gold-pale' : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                )}
              >
                <NavIcon aria-hidden="true" size={20} weight={active ? 'fill' : 'regular'} />
                {label}
              </Link>
            )
          })}
        </nav>
        <form action={signOut} className="border-t border-white/10 p-4">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2.5 font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            <SignOutIcon aria-hidden="true" size={20} />
            Sign out
          </button>
        </form>
      </aside>

      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#140b0e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
      >
        <div className="flex items-stretch justify-around px-2 py-1.5">
          {NAV.filter((n) => n.phone !== false).map(({ href, label, icon: NavIcon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 px-2"
              >
                <NavIcon aria-hidden="true" size={24} weight={active ? 'fill' : 'regular'} className={active ? 'text-gold-pale' : 'text-zinc-400'} />
                <span className={cn('text-[11px] font-medium', active ? 'text-gold-pale' : 'text-zinc-400')}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
