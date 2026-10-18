import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { GUIDES } from '@/content/guides'

export const metadata: Metadata = {
  title: 'Guides',
  description: 'Plain answers before you buy a sofa online: cash on delivery, delivery times, sizes, corner sofas, high or scatter backs, recliners, fabrics and leather-look.',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  return (
    <div className="mx-auto flex max-w-[46rem] flex-col gap-8 px-4 pb-16 pt-6 lg:pb-24 lg:pt-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-[38px] leading-[1.06] lg:text-[56px]">Guides</h1>
        <p className="text-[17px] leading-relaxed text-slate lg:text-[19px]">Straight answers to the things worth knowing before you buy a sofa online.</p>
      </header>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group flex items-center justify-between gap-4 py-5 text-ink no-underline">
              <span className="flex flex-col gap-1">
                <span className="font-display text-[24px] leading-tight group-hover:text-velvet lg:text-[28px]">{g.title}</span>
                <span className="text-[15px] leading-snug text-slate">{g.summary}</span>
              </span>
              <CaretRightIcon aria-hidden="true" size={20} className="shrink-0 text-velvet" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
