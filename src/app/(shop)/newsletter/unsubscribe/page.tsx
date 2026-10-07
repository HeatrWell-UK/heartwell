import type { Metadata } from 'next'
import { UnsubscribeButton } from '../NewsletterButtons'

export const metadata: Metadata = { title: 'Stop our emails', robots: { index: false, follow: false } }

export default async function NewsletterUnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <div className="mx-auto flex max-w-[36rem] flex-col gap-5 px-4 pb-16 pt-8 lg:pt-14">
      <h1 className="text-[32px] leading-tight">Stop our emails</h1>
      {token ? (
        <>
          <p className="text-[17px] leading-relaxed text-slate">Tap below and we’ll stop sending you emails about new sofas and offers. Emails about an order you place still arrive.</p>
          <UnsubscribeButton token={token} />
        </>
      ) : (
        <p className="text-[17px] leading-relaxed text-slate">This link is missing something. Reply to any of our emails and we’ll stop them for you.</p>
      )}
    </div>
  )
}
