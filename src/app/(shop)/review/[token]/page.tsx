import type { Metadata } from 'next'
import Image from 'next/image'
import { CheckCircleIcon } from '@phosphor-icons/react/ssr'
import { createPublicClient } from '@/lib/supabase/public'
import { CONTACT } from '@/config/contact'
import { ReviewForm } from './ReviewForm'

// The private review page, from the link in the review email. Never indexed,
// never cached: the token in the address is the customer's proof of purchase.

export const metadata: Metadata = { title: 'Review your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

interface Invite {
  outcome: 'ok' | 'invalid' | 'not_delivered'
  reference?: string
  first_name?: string
  suggested_name?: string
  products?: { id: string; title: string; slug: string; image: string | null; reviewed: boolean }[]
}

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
  const invite: Invite = valid ? (((await createPublicClient().rpc('review_invite', { p_token: token })).data as Invite | null) ?? { outcome: 'invalid' }) : { outcome: 'invalid' }

  if (invite.outcome !== 'ok') {
    return (
      <div className="mx-auto flex max-w-[36rem] flex-col gap-4 px-4 pb-16 pt-8 lg:pt-14">
        <h1 className="text-[32px] leading-tight">{invite.outcome === 'not_delivered' ? 'Not delivered yet' : 'This link doesn’t work'}</h1>
        <p className="text-[17px] leading-relaxed text-slate">
          {invite.outcome === 'not_delivered'
            ? 'You can review your order once it has been delivered. We’ll email you a link a few days after.'
            : `Please use the button in our email. If it still doesn’t work, email ${CONTACT.email} and we’ll send a new one.`}
        </p>
      </div>
    )
  }

  const products = invite.products ?? []
  return (
    <div className="mx-auto flex max-w-[44rem] flex-col gap-8 px-4 pb-16 pt-6 lg:pt-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[32px] leading-tight lg:text-[40px]">How are you getting on, {invite.first_name}?</h1>
        <p className="text-[17px] leading-relaxed text-slate">
          Your review helps other people choose. We publish every genuine review, good or bad, once we’ve read it. Order {invite.reference}.
        </p>
      </header>
      {products.map((p) => (
        <section key={p.id} aria-labelledby={`p-${p.id}`} className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line p-4 lg:p-6">
          <div className="flex items-center gap-4">
            {p.image && (
              <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-stone">
                <Image src={p.image} alt="" width={160} height={160} sizes="80px" className="size-full object-contain" />
              </span>
            )}
            <h2 id={`p-${p.id}`} className="text-[22px] leading-tight">
              {p.title}
            </h2>
          </div>
          {p.reviewed ? (
            <p className="flex items-center gap-2 text-[16px] font-semibold">
              <CheckCircleIcon aria-hidden="true" size={24} weight="fill" className="text-velvet" />
              Reviewed. Thank you!
            </p>
          ) : (
            <ReviewForm token={token} productId={p.id} productTitle={p.title} suggestedName={invite.suggested_name ?? ''} />
          )}
        </section>
      ))}
    </div>
  )
}
