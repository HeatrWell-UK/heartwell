import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { SealCheckIcon } from '@phosphor-icons/react/ssr'
import { Stars } from '@/components/ui/Stars'
import { ButtonLink } from '@/components/ui/Button'
import { CATALOGUE_TAG } from '@/lib/catalogue/listing'
import { createPublicClient } from '@/lib/supabase/public'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'
import { ukDate } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Reviews',
  description: 'Reviews of Heartwell sofas, only from people who bought from us.',
  alternates: { canonical: '/reviews' },
}
export const revalidate = 300

/** Every approved review, newest first. Admin approvals expire this (catalogue tag). */
const getReviews = unstable_cache(
  async () => {
    if (!SUPABASE_CONFIGURED) return []
    const { data, error } = await createPublicClient()
      .from('reviews')
      .select('id, customer_name, rating, title, comment, created_at, product:products(slug, title)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(`Reviews: ${error.message}`)
    return data
  },
  ['reviews-page-v1'],
  { revalidate: 300, tags: [CATALOGUE_TAG] },
)

export default async function ReviewsPage() {
  const reviews = await getReviews()
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  return (
    <div className="mx-auto flex max-w-[52rem] flex-col gap-8 px-4 pb-16 pt-6 lg:pt-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[32px] leading-tight lg:text-[44px]">Reviews</h1>
        <p className="text-[17px] leading-relaxed text-slate">
          Only from people who bought from us: each review comes from a private link we send a few days after delivery, and we publish them good or bad.
        </p>
        {reviews.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 text-[17px] font-semibold">
            <Stars rating={average} size={22} />
            {average.toFixed(1)} out of 5 from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        )}
      </header>
      {reviews.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-dashed border-field p-5">
          <p className="font-semibold">No reviews yet</p>
          <p className="text-[15px] leading-relaxed text-slate">
            Heartwell is new, so the first reviews will come from our first customers. We’ll never show reviews from anywhere else, or invent any.
          </p>
          <ButtonLink href="/sofas" variant="secondary" className="self-start">
            Shop sofas
          </ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-line p-4 lg:p-5">
              <Stars rating={r.rating} size={18} />
              {r.title && <p className="font-semibold">{r.title}</p>}
              {r.comment && <p className="whitespace-pre-line text-[15px] leading-relaxed text-body-dark">{r.comment}</p>}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate">
                <span>
                  {r.customer_name}, {ukDate(new Date(r.created_at), { weekday: false, year: true })}
                </span>
                <span className="flex items-center gap-1">
                  <SealCheckIcon aria-hidden="true" size={16} className="text-velvet" />
                  Bought from us
                </span>
                {r.product && (
                  <Link href={`/products/${r.product.slug}`} className="font-semibold">
                    {r.product.title}
                  </Link>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
