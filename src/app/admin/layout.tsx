import type { Metadata } from 'next'

// Every admin page: kept out of search engines and away from tracking.
export const metadata: Metadata = {
  title: { template: '%s | Heartwell Admin', default: 'Heartwell Admin' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-1 flex-col bg-zinc-50 text-zinc-900">{children}</div>
}
