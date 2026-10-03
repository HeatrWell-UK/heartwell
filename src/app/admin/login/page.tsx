import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LogoLockup } from '@/components/brand/Logo'
import { getAdmin } from '@/lib/auth/admin'
import { safeNextPath } from '@/lib/http/origin'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  if (await getAdmin()) redirect(safeNextPath(next))

  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-start gap-4">
          <LogoLockup height={28} />
          <div>
            <h1 className="font-display text-2xl font-bold text-zinc-900">Admin sign in</h1>
            <p className="mt-1 text-[15px] text-zinc-500">For the Heartwell team only.</p>
          </div>
        </div>
        <LoginForm next={safeNextPath(next)} />
      </div>
    </main>
  )
}
