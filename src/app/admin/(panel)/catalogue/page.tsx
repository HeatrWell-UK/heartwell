import type { Metadata } from 'next'
import Image from 'next/image'
import { ImageBrokenIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr'
import { loadCatalogue, type CatalogueRow } from '@/lib/admin/load-catalogue'
import { dimensionSummary, ISSUE_LABEL } from '@/lib/catalogue/display'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Catalogue' }
export const dynamic = 'force-dynamic'

const TIER_LABEL: Record<string, string> = {
  HIGH: 'Offer: high',
  MID: 'Offer: mid',
  STANDARD: 'Offer: standard',
  EXCLUDED: 'No offer',
}

function Chip({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warn' | 'dark' | 'gold' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
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

function ProductCard({ p }: { p: CatalogueRow }) {
  const size = dimensionSummary(p)
  const options = [p.axis1_value, p.axis2_value].filter(Boolean).join(' · ')

  return (
    <li id={p.slug} className="scroll-mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:size-24">
          {p.photo ? (
            <Image src={p.photo} alt="" fill sizes="96px" className="object-contain" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-zinc-500">
              <ImageBrokenIcon aria-hidden="true" size={22} />
              No photo
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="font-semibold text-zinc-900">{p.title}</h3>
            <p className="font-semibold tabular-nums text-zinc-900">{formatPrice(p.base_price)}</p>
          </div>
          <p className="text-sm text-zinc-600">
            {[p.type?.name, options].filter(Boolean).join(' · ')}
            {p.is_active && (
              <>
                {' · '}
                <a href={`/products/${p.slug}`} target="_blank" rel="noopener" className="font-medium text-zinc-700 underline underline-offset-2">
                  View on site
                </a>
              </>
            )}
          </p>
          <p className="text-sm text-zinc-700">{size ?? <span className="text-zinc-400">Size not known</span>}</p>
        </div>
      </div>

      {p.variants.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-zinc-100 pt-3 text-sm" aria-label="Colourways">
          {p.variants.map((v) => (
            <li key={v.sku} className={cn('flex items-center gap-1.5', !v.is_active && 'text-zinc-400 line-through')}>
              <span
                aria-hidden="true"
                className="size-3.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: v.colour_hex ?? 'transparent' }}
              />
              <span className="text-zinc-800">{v.colour_name ?? 'No name'}</span>
              <span className="font-mono text-xs text-zinc-400">{v.sku}</span>
              {v.price_adjustment !== 0 && (
                <span className="text-xs text-zinc-500">
                  {v.price_adjustment > 0 ? '+' : '−'}
                  {formatPrice(Math.abs(v.price_adjustment))}
                </span>
              )}
              {!v.image_url && <span className="text-xs text-amber-800">(no photo)</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {!p.is_active && <Chip tone="dark">Hidden</Chip>}
        {p.is_featured && <Chip tone="gold">Featured</Chip>}
        {p.made_to_order && <Chip>Made to order</Chip>}
        {p.origin === 'uk' && <Chip>Made in the UK</Chip>}
        {p.tier && <Chip>{TIER_LABEL[p.tier.tier] ?? p.tier.tier}</Chip>}
        {p.categories.map((c) => (
          <Chip key={c}>{c}</Chip>
        ))}
        {p.issues.map((i) => (
          <Chip key={i} tone="warn">
            <WarningCircleIcon aria-hidden="true" size={14} />
            {ISSUE_LABEL[i]}
          </Chip>
        ))}
      </div>
    </li>
  )
}

export default async function CataloguePage() {
  const { groups, collections, totals, attention } = await loadCatalogue()

  const tiles = [
    { label: 'Products', value: totals.products, note: totals.hidden ? `${totals.hidden} hidden` : 'All shown' },
    { label: 'Colourways', value: totals.variants, note: 'Photographed colours' },
    { label: 'Fabrics', value: totals.materials, note: `${totals.collections} collections` },
    { label: 'Need attention', value: totals.needsAttention, note: totals.needsAttention ? 'Listed below' : 'Nothing missing' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Catalogue</h1>
        <p className="text-[15px] text-zinc-600">
          Everything imported, as it is stored. Read-only for now: editing arrives with the product pages. Photos, titles and
          descriptions are redone after the site is built.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-zinc-900">{t.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{t.note}</p>
          </div>
        ))}
      </div>

      {attention.length > 0 && (
        <section aria-labelledby="attention" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 id="attention" className="flex items-center gap-2 font-semibold text-amber-950">
            <WarningCircleIcon aria-hidden="true" size={20} />
            Need attention
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-[15px]">
            {attention.map((p) => (
              <li key={p.slug}>
                <a href={`#${p.slug}`} className="font-medium text-amber-950 underline underline-offset-2">
                  {p.title}
                </a>
                <span className="text-amber-900">: {p.issues.map((i) => ISSUE_LABEL[i].toLowerCase()).join(', ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`range-${g.key}`} className="flex flex-col gap-3">
          <h2 id={`range-${g.key}`} className="font-display text-xl font-bold tracking-tight text-zinc-900">
            {g.name} <span className="text-base font-normal text-zinc-500">({g.products.length})</span>
          </h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {g.products.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="fabrics" className="flex flex-col gap-3">
        <h2 id="fabrics" className="font-display text-xl font-bold tracking-tight text-zinc-900">
          Fabric library
        </h2>
        <ul className="grid gap-3 lg:grid-cols-2">
          {collections.map((c) => (
            <li key={c.slug} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-zinc-900">{c.name}</h3>
                <p className="text-sm text-zinc-500">
                  {c.materials.length} {c.materials.length === 1 ? 'colour' : 'colours'}
                  {!c.is_active && ' · hidden'}
                </p>
              </div>
              <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3">
                {c.materials.map((m) => (
                  <li key={m.code} className={cn('flex flex-col items-center gap-1 text-center', !m.is_active && 'opacity-40')}>
                    <span
                      className="relative size-12 overflow-hidden rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: m.hex ?? undefined }}
                    >
                      {m.image_url && <Image src={m.image_url} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <span className="text-xs leading-tight text-zinc-800">{m.name}</span>
                    <span className="font-mono text-[11px] text-zinc-400">{m.code}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
