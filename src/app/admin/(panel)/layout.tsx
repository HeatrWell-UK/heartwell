import { AdminNav } from '@/components/admin/AdminNav'
import { requireAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <>
      <AdminNav email={admin.email} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 lg:ml-64 lg:px-10 lg:pb-10 lg:pt-10">
        {children}
      </main>
    </>
  )
}
