import type { Metadata } from 'next'
import { ConfirmButton } from '../NewsletterButtons'

export const metadata: Metadata = { title: 'Confirm your emails', robots: { index: false, follow: false } }

export default async function NewsletterConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <div className="mx-auto flex max-w-[36rem] flex-col gap-5 px-4 pb-16 pt-8 lg:pt-14">
      <h1 className="text-[32px] leading-tight">Confirm your emails</h1>
      {token ? (
        <>
          <p className="text-[17px] leading-relaxed text-slate">Tap below to get emails from Heartwell about new sofas, fabrics and offers. You can stop them any time.</p>
          <ConfirmButton token={token} />
        </>
      ) : (
        <p className="text-[17px] leading-relaxed text-slate">This link is missing something. Please use the button in the email we sent you.</p>
      )}
    </div>
  )
}
