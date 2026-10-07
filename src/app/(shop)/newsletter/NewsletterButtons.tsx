'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { confirmSubscription, unsubscribe } from './actions'

/** Confirming is a press, not a page visit, so mail scanners opening the link can't sign anyone up. */
export function ConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')
  const [stopToken, setStopToken] = useState<string | null>(null)
  if (state === 'done') {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-[17px] font-semibold">
          <CheckCircleIcon aria-hidden="true" size={28} weight="fill" className="text-velvet" />
          You’re signed up. Thank you.
        </p>
        <p className="text-[15px] text-slate">
          Changed your mind?{' '}
          {stopToken ? <Link href={`/newsletter/unsubscribe?token=${encodeURIComponent(stopToken)}`}>Stop the emails</Link> : 'Every email has a link to stop them.'}
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <Button
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy')
          const r = await confirmSubscription(token).catch(() => ({ ok: false, unsubscribeToken: undefined }))
          setStopToken(r.unsubscribeToken ?? null)
          setState(r.ok ? 'done' : 'failed')
        }}
      >
        {state === 'busy' ? 'Confirming…' : 'Yes, send me emails'}
      </Button>
      {state === 'failed' && (
        <p role="alert" className="text-[15px] font-semibold text-error">
          That link has expired or was already used. Please sign up again from the bottom of any page.
        </p>
      )}
    </div>
  )
}

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')
  if (state === 'done') {
    return (
      <p role="status" className="flex items-center gap-2 text-[17px] font-semibold">
        <CheckCircleIcon aria-hidden="true" size={28} weight="fill" className="text-velvet" />
        Done. You won’t get any more emails from us.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <Button
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy')
          const r = await unsubscribe(token).catch(() => ({ ok: false }))
          setState(r.ok ? 'done' : 'failed')
        }}
      >
        {state === 'busy' ? 'Stopping…' : 'Stop the emails'}
      </Button>
      {state === 'failed' && (
        <p role="alert" className="text-[15px] font-semibold text-error">
          We couldn’t find that link. Reply to any of our emails and we’ll stop them for you.
        </p>
      )}
    </div>
  )
}
