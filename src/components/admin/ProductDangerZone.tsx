'use client'

// Hiding or deleting a product. A product that has ever been ordered can only
// be hidden, so every order keeps the product it refers to.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProduct, setProductShown } from '@/app/admin/(panel)/catalogue/actions'
import { dangerButton, inputClass, labelClass, OutcomeNote, secondaryButton, type Outcome } from './Fields'

export function ProductDangerZone({ id, title, isActive, orderCount }: { id: string; title: string; isActive: boolean; orderCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [outcome, setOutcome] = useState<Outcome>(null)

  async function toggle() {
    setBusy(true)
    const r = await setProductShown(id, !isActive).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
    setBusy(false)
    setOutcome(r)
    if (r.ok) router.refresh()
  }

  async function remove() {
    setBusy(true)
    const r = await deleteProduct(id).catch(() => ({ ok: false as const, message: 'Couldn’t reach the server. Try again.' }))
    setBusy(false)
    if (!r.ok) return setOutcome(r)
    router.push(`/admin/catalogue?deleted=${encodeURIComponent(title)}`)
  }

  return (
    <section aria-labelledby="danger-title" className="flex flex-col gap-4 rounded-xl border border-red-200 bg-white p-4 sm:p-5">
      <h2 id="danger-title" className="text-lg font-bold text-red-900">
        Hide or delete
      </h2>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-700">
          {isActive ? 'Hiding takes it off the shop straight away. You can show it again any time.' : 'It’s hidden from the shop. Show it again when it’s ready.'}
        </p>
        <button type="button" disabled={busy} onClick={toggle} className={`${secondaryButton} self-start`}>
          {isActive ? 'Hide from the shop' : 'Show in the shop'}
        </button>
      </div>
      {orderCount > 0 ? (
        <p className="text-sm text-zinc-700">
          It’s on {orderCount} order {orderCount === 1 ? 'line' : 'lines'}, so it can’t be deleted (orders keep their products). Hide it instead.
        </p>
      ) : (
        <div className="flex flex-col gap-2 border-t border-red-100 pt-4">
          <label htmlFor="delete-confirm" className={labelClass}>
            Delete for good: type DELETE
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" autoComplete="off" className={`${inputClass} max-w-48`} />
            <button type="button" disabled={busy || confirm.trim() !== 'DELETE'} onClick={remove} className={dangerButton}>
              Delete product
            </button>
          </div>
          <p className="text-xs text-zinc-500">Removes it with its colourways. Its photos stay in Cloudinary.</p>
        </div>
      )}
      <OutcomeNote outcome={outcome} />
    </section>
  )
}
