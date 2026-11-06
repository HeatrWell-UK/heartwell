'use client'

// On a saved WhatsApp or phone order: link (or change, or unlink) the website
// visit behind it, until its Purchase has gone to Meta.

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { FindVisitToggle } from '@/components/admin/OrderForms'
import { linkOrderVisit } from '@/app/admin/(panel)/orders/actions'

const input = 'min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 font-mono text-[16px] text-zinc-900 focus:border-zinc-900 focus:outline-none'

export function LinkVisitForm({ orderId, current, isTest, contactHint }: { orderId: string; current: string; isTest: boolean; contactHint: string }) {
  const router = useRouter()
  const id = useId()
  const [reference, setReference] = useState(current)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async (ref: string) => {
    setSaving(true)
    const r = await linkOrderVisit(orderId, ref).catch(() => ({ ok: false, message: 'Couldn’t reach the server. Try again.' }))
    setSaving(false)
    setResult(r)
    if (r.ok) router.refresh()
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save(reference)
        }}
      >
        <label htmlFor={`${id}-ref`} className="text-sm font-semibold text-zinc-800">
          {current ? 'Linked visit (change it before the order’s Purchase goes to Meta)' : 'Link their website visit: HW-V or HW-WA reference'}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`${id}-ref`}
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase().trim())}
            placeholder="HW-V-… or HW-WA-…"
            className={`${input} flex-1`}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button type="submit" disabled={saving || !reference || reference === current} className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Link visit'}
          </button>
          {current && (
            <button type="button" disabled={saving} onClick={() => void save('')} className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300">
              Unlink
            </button>
          )}
        </div>
      </form>
      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'text-sm font-semibold text-emerald-800' : 'rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 ring-1 ring-red-200'}>
          {result.message}
        </p>
      )}
      <FindVisitToggle reference={reference} onUse={(r) => setReference((cur) => (cur === r ? current : r))} includeTests={isTest} contactHint={contactHint} />
    </div>
  )
}
