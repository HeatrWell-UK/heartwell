import Form from 'next/form'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr'
import { cn } from '@/lib/cn'

/** The search field: on the search page, and on the page-not-found page. */
export function SearchBox({ defaultValue = '', className }: { defaultValue?: string; className?: string }) {
  return (
    <Form action="/search" role="search" className={cn('flex w-full max-w-[44rem] gap-2', className)}>
      <label htmlFor="q" className="sr-only">
        Search sofas
      </label>
      <span className="relative flex min-w-0 flex-1">
        <MagnifyingGlassIcon aria-hidden="true" size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate" />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Try “corner grey” or “recliner”"
          className="h-14 min-w-0 flex-1 rounded-full border-[1.5px] border-field bg-white pl-12 pr-4 text-ink placeholder:text-slate/70 focus:border-velvet focus:shadow-[0_0_0_4px_var(--color-gold-tint)] focus:outline-none"
        />
      </span>
      <button type="submit" className="h-14 shrink-0 rounded-full bg-velvet-sheen px-6 font-semibold text-white hover:brightness-110">
        Search
      </button>
    </Form>
  )
}
