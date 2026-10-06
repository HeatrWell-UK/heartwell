import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CaretRightIcon, ImageBrokenIcon, PlusIcon, TreeStructureIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr'
import { loadCatalogue, type CatalogueRow } from '@/lib/admin/load-catalogue'
import { dimensionSummary, ISSUE_LABEL } from '@/lib/catalogue/display'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Catalogue' }
export const dynamic = 'force-dynamic'

const SHOW = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'In the shop' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'attention', label: 'Need attention' },
] as const
type Show = (typeof SHOW)[number]['value']

function Chip({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warn' | 'dark' | 'gold' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'plain' && 'bg-zinc-100 text-zinc-700',
        tone === 'warn' && 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
        tone === 'dark' && 'bg-zinc-800 text-white',
        tone === 'gold' && 'bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200',
      )}
    >
      {children}
    </span>
  )
}

function Row({ p }: { p: CatalogueRow }) {
  const options = [p.axis1_value, p.axis2_value].filter(Boolean).join(' · ')
  const colours = p.variants.filter((v) => v.is_active)
  return (
    <li>
      <Link href={`/admin/catalogue/${p.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm hover:border-zinc-300">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
          {p.photo ? (
            <Image src={p.photo} alt="" width={128} height={128} sizes="64px" className="size-full object-contain" />
          ) : (
            <span className="flex size-full items-center justify-center text-zinc-400">
              <ImageBrokenIcon aria-hidden="true" size={22} />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold text-zinc-900">{p.title}</span>
            <span className="shrink-0 font-semibold tabular-nums text-zinc-900">{formatPrice(p.base_price)}</span>
          </span>
          <span className="truncate text-sm text-zinc-600">{[p.type?.name, options, dimensionSummary(p)].filter(Boolean).join(' · ')}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            {colours.slice(0, 8).map((v) => (
              <span key={v.sku} title={v.colour_name ?? v.sku} className="size-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: v.colour_hex ?? 'transparent' }} />
            ))}
            {colours.length > 8 && <span className="text-xs text-zinc-500">+{colours.length - 8}</span>}
            {!p.is_active && <Chip tone="dark">Hidden</Chip>}
            {p.is_featured && <Chip tone="gold">Featured</Chip>}
            {p.made_to_order && <Chip>Made to order</Chip>}
            {p.issues.map((i) => (
              <Chip key={i} tone="warn">
                <WarningCircleIcon aria-hidden="true" size={12} />
                {ISSUE_LABEL[i]}
              </Chip>
            ))}
          </span>
        </span>
        <CaretRightIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  )
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; show?: string; deleted?: string }> }) {
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 60)
  const show: Show = SHOW.some((s) => s.value === params.show) ? (params.show as Show) : 'all'
  const { rows, groups, totals } = await loadCatalogue()

  const types = [...new Map(rows.flatMap((r) => (r.type ? [[r.type.slug, r.type.name] as const] : []))).entries()]
  const type = types.some(([slug]) => slug === params.type) ? params.type! : ''
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (p: CatalogueRow) => {
    if (type && p.type?.slug !== type) return false
    if (show === 'live' && !p.is_active) return false
    if (show === 'hidden' && p.is_active) return false
    if (show === 'attention' && p.issues.length === 0) return false
    if (!words.length) return true
    const hay = [p.title, p.slug, p.range?.name, p.axis1_value, p.axis2_value, ...p.categories, ...p.variants.flatMap((v) => [v.sku, v.colour_name])].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  }
  const shown = groups.map((g) => ({ ...g, products: g.products.filter(matches) })).filter((g) => g.products.length > 0)
  const count = shown.reduce((n, g) => n + g.products.length, 0)
  const filtered = Boolean(q || type || show !== 'all')

  const tiles = [
    { label: 'Products', value: totals.products, note: totals.hidden ? `${totals.hidden} hidden` : 'All in the shop' },
    { label: 'Colourways', value: totals.variants, note: 'With their SKUs' },
    { label: 'Need attention', value: totals.needsAttention, note: totals.needsAttention ? 'Missing a photo or size' : 'Nothing missing' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Catalogue</h1>
        <p className="text-[15px] text-zinc-600">Every product, hidden ones included. Changes show in the shop on the next visit.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/catalogue/new" className="flex min-h-11 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
            <PlusIcon aria-hidden="true" size={16} weight="bold" /> Add a product
          </Link>
          <Link href="/admin/catalogue/structure" className="flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">
            <TreeStructureIcon aria-hidden="true" size={18} /> Types, categories, ranges and fabrics
          </Link>
        </div>
      </header>

      {params.deleted && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
          Deleted “{params.deleted.slice(0, 120)}”.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 lg:gap-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-zinc-900 lg:text-3xl">{t.value}</p>
            <p className="mt-1 text-xs text-zinc-500 lg:text-sm">{t.note}</p>
          </div>
        ))}
      </div>

      <form method="get" className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="cat-q" className="text-sm font-semibold text-zinc-800">
            Search
          </label>
          <input id="cat-q" name="q" type="search" defaultValue={q} placeholder="Name, range, colour or SKU" className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[16px]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="flex flex-col gap-1">
            <label htmlFor="cat-type" className="text-sm font-semibold text-zinc-800">
              Type
            </label>
            <select id="cat-type" name="type" defaultValue={type} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[16px]">
              <option value="">All types</option>
              {types.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cat-show" className="text-sm font-semibold text-zinc-800">
              Show
            </label>
            <select id="cat-show" name="show" defaultValue={show} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[16px]">
              {SHOW.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="min-h-11 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white">
          Find
        </button>
      </form>

      {filtered && (
        <p className="text-sm text-zinc-600">
          {count} {count === 1 ? 'product' : 'products'} found.{' '}
          <Link href="/admin/catalogue" className="font-semibold text-zinc-800 underline underline-offset-2">
            Clear
          </Link>
        </p>
      )}

      {shown.map((g) => (
        <section key={g.key} aria-labelledby={`range-${g.key}`} className="flex flex-col gap-2">
          <h2 id={`range-${g.key}`} className="text-base font-bold text-zinc-900">
            {g.name} <span className="font-normal text-zinc-500">({g.products.length})</span>
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {g.products.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
