import Link from 'next/link'

/** "Sofas / Corner sofas": where this page sits. The current page isn't repeated. */
export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  if (items.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-[1200px] px-4 py-2.5 text-sm lg:px-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-slate">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link href={item.href} className="text-slate hover:text-wine">
              {item.name}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
