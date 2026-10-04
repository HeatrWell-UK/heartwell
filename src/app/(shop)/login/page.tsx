import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/auth/admin'
import { safeNextPath } from '@/lib/http/origin'
import { LoginForm } from './LoginForm'

// An ordinary account sign-in, in the shop's own frame. It isn't linked from
// the site and stays out of search engines; signing in with an admin account
// leads to the page that was asked for (the admin by default).
export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const destination = safeNextPath(next)
  if (await getAdmin()) redirect(destination)

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 lg:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] leading-tight">Sign in</h1>
        <p className="text-[17px] text-slate">Enter your email address and password.</p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-5 sm:p-6">
        <LoginForm next={destination} />
      </div>
    </section>
  )
}
