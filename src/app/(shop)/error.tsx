'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { EmptyAlcove } from '@/components/content/EmptyAlcove'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-[46rem] flex-col items-start gap-6 px-4 py-12 lg:py-20">
      <EmptyAlcove />
      <div className="flex flex-col gap-3">
        <h1 className="text-[38px] leading-[1.06] lg:text-[56px]">This page didn&rsquo;t load</h1>
        <p className="text-[17px] leading-relaxed text-slate lg:text-lg">
          Something went wrong on our side. Please try again; if it keeps happening, <Link href="/contact">contact us</Link> and we&rsquo;ll help.
          Your basket is safe on this phone.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </section>
  )
}
