'use client'

// A button that runs one Server Action (bound on the server, e.g.
// setSampleStatus.bind(null, id, 'posted')), then refreshes the page and says
// what happened.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'

type Result = { ok: boolean; message: string }

export function ActButton({ act, label, tone = 'plain', confirm }: { act: () => Promise<Result>; label: string; tone?: 'plain' | 'primary' | 'danger'; confirm?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return
          setBusy(true)
          const r = await act().catch(() => ({ ok: false, message: 'Couldn’t reach the server. Try again.' }))
          setBusy(false)
          setResult(r)
          if (r.ok) router.refresh()
        }}
        className={cn(
          'flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-60',
          tone === 'primary' && 'bg-zinc-900 text-white',
          tone === 'plain' && 'bg-white text-zinc-800 ring-1 ring-zinc-200 hover:ring-zinc-300',
          tone === 'danger' && 'bg-white text-red-700 ring-1 ring-red-200',
        )}
      >
        {busy ? 'Working…' : label}
      </button>
      {result && (
        <span role={result.ok ? 'status' : 'alert'} className={cn('text-xs font-semibold', result.ok ? 'text-emerald-800' : 'text-red-700')}>
          {result.message}
        </span>
      )}
    </span>
  )
}
