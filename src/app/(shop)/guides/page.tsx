import type { Metadata } from 'next'
import Link from 'next/link'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'
import { GUIDES } from '@/content/guides'

export const metadata: Metadata = {
  title: 'Guides',
  description: 'Plain answers before you buy a sofa online: paying on delivery, made to order, measuring, sizes, fabrics and delivery day.',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  return (
    <div className="mx-auto flex max-w-[46rem] flex-col gap-6 px-4 pb-16 pt-6 lg:pt-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[34px] leading-[1.1] lg:text-[48px]">Guides</h1>
        <p className="text-[17px] leading-relaxed text-slate lg:text-[18px]">Straight answers to the things worth knowing before you buy a sofa online.</p>
      </header>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group flex items-center justify-between gap-4 py-5 text-ink no-underline">
              <span className="flex flex-col gap-1">
                <span className="font-display text-[22px] font-bold leading-tight group-hover:text-velvet">{g.title}</span>
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
