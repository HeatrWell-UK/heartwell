import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CaretRightIcon,
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
} from '@phosphor-icons/react/ssr'
import type { Icon } from '@phosphor-icons/react'
import { signOut } from '@/app/admin/actions'
import { MORE_GROUPS, type NavIconName } from '@/lib/admin/nav'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'More' }
export const dynamic = 'force-dynamic'

const ICONS: Record<NavIconName, Icon> = {
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

/** On phones, every section that isn't on the tab bar, in the same groups as the desktop sidebar (src/lib/admin/nav.ts). */
export default async function AdminMorePage() {
  const { count } = await (await createClient()).from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false)
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">More</h1>
      {MORE_GROUPS.map((g) => (
        <section key={g.key} aria-labelledby={`more-${g.key}`} className="flex flex-col gap-2">
          <h2 id={`more-${g.key}`} className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {g.label}
          </h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {g.items.map(({ href, label, note, icon }) => {
              const LinkIcon = ICONS[icon]
              return (
                <li key={href}>
                  <Link href={href} className="flex min-h-14 items-center gap-4 px-4 py-3 hover:bg-zinc-50">
                    <LinkIcon aria-hidden="true" size={22} className="shrink-0 text-zinc-500" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold text-zinc-900">{label}</span>
                      <span className="text-sm text-zinc-500">{href === '/admin/reviews' ? (count ? `${count} waiting` : 'Nothing waiting') : note}</span>
                    </span>
                    <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <form action={signOut}>
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-[15px] font-semibold text-red-700">
          <SignOutIcon aria-hidden="true" size={20} />
          Sign out
        </button>
      </form>
    </div>
  )
}
