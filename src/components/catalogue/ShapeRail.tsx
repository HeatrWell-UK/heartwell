import Link from 'next/link'
import { cn } from '@/lib/cn'
import { sentenceCase } from '@/lib/catalogue/listing'
import { categoryHref, childrenOf, trail, type CategoryNode } from '@/lib/catalogue/tree'
import { CentreCurrent } from '@/components/ui/CentreCurrent'
import { ShapePlan } from './ShapePlan'

const chip =
  'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[15px] font-semibold no-underline hover:border-velvet hover:text-ink'

/**
 * Every category in the department, with its top-view plan where it's a shape,
 * so people can hop from corners to U-shapes without going back. The page
 * they're on is marked. A category with its own kinds (recliners: electric)
 * gets a second row for those. A row to swipe on phones; it wraps on desktops.
 */
export function ShapeRail({
  tree,
  node,
  department: given,
  alwaysTop = false,
}: {
  tree: CategoryNode[]
  node: CategoryNode | null
  department?: CategoryNode
  /** Show the main row on desktops too (search, where the header row isn't enough of a prompt). */
  alwaysTop?: boolean
}) {
  const path = node ? trail(tree, node) : given ? [given] : []
  const department = path[0]
  if (!department) return null
  const top = childrenOf(tree, department.id)
  if (top.length === 0) return null
  const activeTop = path[1] ?? null
  const kinds = activeTop ? childrenOf(tree, activeTop.id) : []

  const item = (c: CategoryNode, label: string, plan: boolean, exact = false) => {
    const current = c.id === node?.id
    // The page's own category, or the one it sits inside (Recliners, on Electric recliners).
    const selected = current || (!exact && c.id !== department.id && path.some((p) => p.id === c.id))
    return (
      <li key={c.id} className="shrink-0">
        <Link
          href={categoryHref(tree, c)}
          aria-current={current ? 'page' : undefined}
          className={cn(chip, selected ? 'border-velvet bg-gold-tint text-velvet hover:text-velvet' : 'border-line text-ink')}
        >
          {plan && <ShapePlan slug={c.slug} width={30} className={cn('shrink-0', selected ? 'text-velvet' : 'text-velvet/80')} />}
          {label}
        </Link>
      </li>
    )
  }

  const row = 'no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0'
  // Desktops already have these in the header's category row (which marks the page you're on), unless asked for here.
  return (
    <nav id="shape-rail" aria-label={`Kinds of ${department.name.toLowerCase()}`} className={cn('flex flex-col gap-2', !alwaysTop && !kinds.length && 'lg:hidden')}>
      <ul className={cn(row, !alwaysTop && 'lg:hidden')}>
        {item(department, `All ${department.name.toLowerCase()}`, false)}
        {top.map((c) => item(c, sentenceCase(c.name), true))}
      </ul>
      {activeTop && kinds.length > 0 && (
        <ul className={row}>
          {item(activeTop, `All ${activeTop.name.toLowerCase()}`, false, true)}
          {kinds.map((c) => item(c, sentenceCase(c.name), false))}
        </ul>
      )}
      <CentreCurrent containerId="shape-rail" />
    </nav>
  )
}
