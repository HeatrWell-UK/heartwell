'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { FadersHorizontalIcon, XIcon } from '@phosphor-icons/react'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/cn'
import { listingHref, SORTS, toggleFilter, type ActiveFilters, type Chip, type Facet, type SortValue } from '@/lib/catalogue/filters'

interface Props {
  path: string
  facets: Facet[]
  filters: ActiveFilters
  sort: SortValue
  chips: Chip[]
  count: number
  noun: string
}

/**
 * Filters and sorting. Each tick updates the address straight away (so a
 * filtered page can be shared) and the counts follow. On phones the filters
 * open in a sheet with a "Show" button; on desktop they sit beside the grid.
 */
export function CatalogueControls(props: Props) {
  const { path, filters, sort, chips, count, noun } = props
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const sortId = useId()
  const go = (href: string) => startTransition(() => router.replace(href, { scroll: false }))
  const active = chips.length

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[15px] font-semibold text-ink lg:hidden"
        >
          <FadersHorizontalIcon aria-hidden="true" size={20} />
          Filter{active > 0 && ` (${active})`}
        </button>
        <p className="hidden text-[15px] text-slate lg:block" aria-live="polite">
          {count} {count === 1 ? noun : `${noun}s`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-[15px] text-slate">
            Sort
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(e) => go(listingHref(path, filters, e.target.value as SortValue))}
            className="min-h-11 rounded-full border border-line bg-white px-3 text-[15px] font-semibold text-ink"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {active > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Filters in use">
          {chips.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                scroll={false}
                replace
                className="flex min-h-9 items-center gap-1.5 rounded-full bg-gold-tint px-3 text-sm font-semibold text-velvet no-underline"
              >
                {c.label}
                <XIcon aria-hidden="true" size={14} weight="bold" />
                <span className="sr-only">(remove)</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={listingHref(path, filters, sort, 'clear')} scroll={false} replace className="text-sm font-semibold">
              Clear all
            </Link>
          </li>
        </ul>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Filter">
        <FilterPanel {...props} go={go} />
        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-line bg-white px-4 pt-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-14 w-full rounded-full bg-velvet-sheen text-[17px] font-semibold text-white"
          >
            {pending ? 'Updating…' : `Show ${count} ${count === 1 ? noun : `${noun}s`}`}
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/** The filter groups themselves: in the phone sheet, and beside the grid on desktop. */
export function FilterPanel({ path, facets, filters, sort, go }: Props & { go?: (href: string) => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const navigate = go ?? ((href: string) => startTransition(() => router.replace(href, { scroll: false })))
  const base = useId()

  if (facets.length === 0) return <p className="text-[15px] text-slate">Nothing to filter here.</p>

  return (
    <div className="flex flex-col gap-5">
      {facets.map((facet) => (
        <fieldset key={facet.key} className="flex flex-col gap-1">
          <legend className="pb-2 text-base font-semibold">{facet.label}</legend>
          {facet.options.map((o) => {
            const id = `${base}-${facet.key}-${o.value}`
            const disabled = o.count === 0 && !o.selected
            return (
              <label key={o.value} htmlFor={id} className={cn('flex min-h-11 cursor-pointer items-center gap-3 text-[15px]', disabled && 'cursor-default text-slate/60')}>
                <input
                  id={id}
                  type={facet.single ? 'radio' : 'checkbox'}
                  name={`${base}-${facet.key}`}
                  checked={o.selected}
                  disabled={disabled}
                  onChange={() => navigate(listingHref(path, toggleFilter(filters, facet.key, o.value), sort))}
                  onClick={(e) => {
                    // A ticked radio unticks on a second tap, like the checkboxes.
                    if (facet.single && o.selected) {
                      e.preventDefault()
                      navigate(listingHref(path, toggleFilter(filters, facet.key, o.value), sort))
                    }
                  }}
                  className="size-5 shrink-0 accent-velvet"
                />
                <span className="flex-1">{o.label}</span>
                <span className="text-sm tabular-nums text-slate">{o.count}</span>
              </label>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}
