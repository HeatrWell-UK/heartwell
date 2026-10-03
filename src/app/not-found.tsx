import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/Button'
import { ShopShell } from '@/components/layout/ShopShell'

export const metadata: Metadata = { title: 'Page not found' }

// Rendered inside the root layout only, so it brings the shop's frame itself.
export default function NotFound() {
  return (
    <ShopShell>
      <section className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-[32px] leading-tight">We can&rsquo;t find that page</h1>
        <p className="text-[17px] text-slate">It may have moved, or the link may be wrong. Everything we sell is a tap away from the home page.</p>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" block className="sm:w-auto">
            Go to the home page
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary" block className="sm:w-auto">
            Contact us
          </ButtonLink>
        </div>
      </section>
    </ShopShell>
  )
}
