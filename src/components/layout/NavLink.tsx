'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

/**
 * A link in the header's category row that knows when it's the page you're on
 * (or a page inside it, like a category's kind), and says so: underlined in
 * velvet, and announced as the current page.
 */
export function NavLink({ href, exact = false, className, children }: { href: string; exact?: boolean; className?: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const current = pathname === href || (!exact && pathname.startsWith(`${href}/`))
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'text-ink no-underline decoration-2 underline-offset-[10px] hover:text-velvet hover:underline',
        current && 'text-velvet underline',
        className,
      )}
    >
      {children}
    </Link>
  )
}
