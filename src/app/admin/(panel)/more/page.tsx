import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon, ChartLineUpIcon, GearSixIcon, LinkSimpleIcon, PulseIcon, SignOutIcon, StarIcon, VideoCameraIcon } from '@phosphor-icons/react/ssr'
import { signOut } from '@/app/admin/actions'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'More' }
export const dynamic = 'force-dynamic'

/** On phones, the sections that don't fit the tab bar. */
export default async function AdminMorePage() {
  const { count } = await (await createClient()).from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false)
  const links = [
    { href: '/admin/reviews', label: 'Reviews', note: count ? `${count} waiting` : 'Nothing waiting', icon: StarIcon },
    { href: '/admin/videos', label: 'Videos', note: 'On product pages', icon: VideoCameraIcon },
    { href: '/admin/tracking', label: 'Tracking', note: 'Meta and Google: mode, purchases sent', icon: ChartLineUpIcon },
    { href: '/admin/ad-links', label: 'Ad links', note: 'Catalogue feed and links for your ads', icon: LinkSimpleIcon },
    { href: '/admin/settings', label: 'Settings', note: 'Delivery prices, offers, samples', icon: GearSixIcon },
    { href: '/admin/status', label: 'Status', note: 'Is everything working?', icon: PulseIcon },
  ]
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">More</h1>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {links.map(({ href, label, note, icon: LinkIcon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-zinc-50">
              <LinkIcon aria-hidden="true" size={24} className="shrink-0 text-zinc-500" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold text-zinc-900">{label}</span>
                <span className="text-sm text-zinc-500">{note}</span>
              </span>
              <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOut}>
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-[15px] font-semibold text-red-700">
          <SignOutIcon aria-hidden="true" size={20} />
          Sign out
        </button>
      </form>
    </div>
  )
}
