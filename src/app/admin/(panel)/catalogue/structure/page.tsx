import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeftIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react/ssr'
import { loadStructure } from '@/lib/admin/load-catalogue'
import { MATERIAL_KIND_LABEL, readSpecFields, type MaterialKind } from '@/lib/admin/structure-form'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Catalogue structure' }
export const dynamic = 'force-dynamic'

function Section({ id, title, intro, addHref, addLabel, children }: { id: string; title: string; intro: string; addHref: string; addLabel: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-lg font-bold text-zinc-900">
            {title}
          </h2>
          <p className="text-sm text-zinc-600">{intro}</p>
        </div>
        <Link href={addHref} className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">
          <PlusIcon aria-hidden="true" size={16} weight="bold" /> {addLabel}
        </Link>
      </div>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">{children}</ul>
    </section>
  )
}

function Item({ href, title, detail, muted, indent = 0 }: { href: string; title: string; detail: string; muted?: boolean; indent?: number }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-zinc-50" style={{ paddingLeft: `${1 + indent * 1.25}rem` }}>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('font-semibold', muted ? 'text-zinc-400' : 'text-zinc-900')}>
            {indent > 0 && <span aria-hidden="true">↳ </span>}
            {title}
          </span>
          <span className="truncate text-sm text-zinc-500">{detail}</span>
        </span>
        <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  )
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default async function StructurePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams
  const { types, categories, ranges, collections } = await loadStructure()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/admin/catalogue" className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-600">
          <ArrowLeftIcon aria-hidden="true" size={16} /> Catalogue
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Structure</h1>
        <p className="text-[15px] text-zinc-600">
          How the catalogue is organised. A new kind of product starts with its type here; see the guide “Adding a product type” in the project docs.
        </p>
      </header>

      {deleted && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
          Deleted {deleted.slice(0, 120)}.
        </p>
      )}

      <Section id="types" title="Product types" intro="What kind of thing a product is: its Specifications fields, filters and materials." addHref="/admin/catalogue/structure/types/new" addLabel="Add a type">
        {types.map((t) => (
          <Item key={t.id} href={`/admin/catalogue/structure/types/${t.id}`} title={t.name} detail={`${plural(t.products, 'product')} · ${plural(readSpecFields(t.spec_fields).length, 'field')}`} />
        ))}
      </Section>

      <Section id="categories" title="Categories" intro="The shop’s menu and category pages. Top-level ones are departments." addHref="/admin/catalogue/structure/categories/new" addLabel="Add a category">
        {categories.map((c) => (
          <Item
            key={c.id}
            href={`/admin/catalogue/structure/categories/${c.id}`}
            title={c.name}
            indent={c.depth}
            muted={!c.is_active}
            detail={[plural(c.products, 'product'), c.is_active ? null : 'hidden'].filter(Boolean).join(' · ')}
          />
        ))}
      </Section>

      <Section id="ranges" title="Ranges" intro="Families of sizes and styles (each product picks its range on its own page)." addHref="/admin/catalogue/structure/ranges/new" addLabel="Add a range">
        {ranges.map((r) => (
          <Item
            key={r.id}
            href={`/admin/catalogue/structure/ranges/${r.id}`}
            title={r.name}
            muted={!r.is_active}
            detail={[plural(r.products, 'product'), [r.axis1_name, r.axis2_name].filter(Boolean).join(' and '), r.is_active ? null : 'hidden'].filter(Boolean).join(' · ')}
          />
        ))}
      </Section>

      <Section id="fabrics" title="Fabrics and materials" intro="The library customers choose from for made-to-order pieces." addHref="/admin/catalogue/structure/fabrics/new" addLabel="Add a collection">
        {collections.map((c) => (
          <Item
            key={c.id}
            href={`/admin/catalogue/structure/fabrics/${c.id}`}
            title={c.name}
            muted={!c.is_active}
            detail={[
              MATERIAL_KIND_LABEL[c.kind as MaterialKind] ?? c.kind,
              plural(c.materials.length, 'colour'),
              Number(c.surcharge) > 0 ? `+${formatPrice(Number(c.surcharge))}` : null,
              c.is_active ? null : 'hidden',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        ))}
      </Section>
    </div>
  )
}
