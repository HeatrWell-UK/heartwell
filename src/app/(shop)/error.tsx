'use client'

import { Button } from '@/components/ui/Button'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-[32px] leading-tight">This page didn&rsquo;t load</h1>
      <p className="text-[17px] text-slate">Something went wrong on our side. Please try again; if it keeps happening, contact us and we&rsquo;ll help.</p>
      <Button onClick={reset}>Try again</Button>
    </section>
  )
}
