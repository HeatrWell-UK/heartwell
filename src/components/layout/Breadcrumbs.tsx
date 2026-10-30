import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * "Sofas / Corner sofas": where this page sits. The current page isn't
 * repeated. `onVelvet` when it heads a velvet band; `contained` inside a box
 * that already has the page's side margins; `dense` where every line counts
 * (the product page's photo stage on phones).
 */
export function Breadcrumbs({
  items,
  onVelvet = false,
  contained = false,
  dense = false,
}: {
  items: { name: string; href: string }[]
  onVelvet?: boolean
  contained?: boolean
  dense?: boolean
}) {
  if (items.length === 0) return null
  const spacing = dense ? 'py-1.5 text-[13px] lg:py-2.5 lg:text-sm' : 'py-2.5 text-sm'
  return (
    <nav aria-label="Breadcrumb" className={contained ? spacing : cn('mx-auto max-w-[1200px] px-4 lg:px-6', spacing)}>
      <ol className={cn('flex flex-wrap items-center gap-1.5', onVelvet ? 'text-on-wine-muted' : 'text-slate')}>
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link href={item.href} className={onVelvet ? 'text-on-wine-muted hover:text-white' : 'text-slate hover:text-wine'}>
              {item.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
