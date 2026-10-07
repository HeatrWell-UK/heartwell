import type { Metadata } from 'next'
import Link from 'next/link'
import { StarIcon } from '@phosphor-icons/react/ssr'
import { ActButton } from '@/components/admin/ActButton'
import { Tag } from '@/components/admin/OrderBits'
import { createClient } from '@/lib/supabase/server'
import { dualTime } from '@/lib/admin/orders'
import { cn } from '@/lib/cn'
import { deleteReview, setReviewApproved } from './actions'

export const metadata: Metadata = { title: 'Reviews' }
export const dynamic = 'force-dynamic'

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-500" role="img" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} aria-hidden="true" size={18} weight={i < value ? 'fill' : 'regular'} />
      ))}
    </span>
  )
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show === 'published' ? 'published' : 'waiting'
  const db = await createClient()
  const [list, waiting, published] = await Promise.all([
    db
      .from('reviews')
      .select('id, created_at, approved_at, customer_name, rating, title, comment, is_approved, is_test, product:products(slug, title), order:orders(id, reference)')
      .eq('is_approved', show === 'published')
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', true),
  ])
  if (list.error) throw new Error(`Reviews: ${list.error.message}`)
  const rows = list.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Reviews</h1>
        <p className="text-[15px] text-zinc-600">
          Every review comes from the private link in a customer’s review email, so each one is from a real order. Publish genuine reviews, good or bad; hide or delete only spam, abuse or
          personal details.
        </p>
      </header>
      <nav aria-label="Reviews" className="flex gap-2">
        {(
          [
            ['waiting', 'Waiting', waiting.count ?? 0],
            ['published', 'Published', published.count ?? 0],
          ] as const
        ).map(([key, label, count]) => (
          <Link
            key={key}
            href={`/admin/reviews${key === 'published' ? '?show=published' : ''}`}
            aria-current={show === key ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1',
              show === key ? 'bg-zinc-900 text-white ring-zinc-900 hover:text-white' : 'bg-white text-zinc-700 ring-zinc-200',
            )}
          >
            {label}
            <span className={cn('rounded-full px-2 py-0.5 text-xs tabular-nums', show === key ? 'bg-white/15' : 'bg-zinc-100')}>{count}</span>
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-[15px] text-zinc-500">
          {show === 'waiting' ? 'Nothing waiting. Review emails go out three days after delivery.' : 'Nothing published yet.'}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Rating value={r.rating} />
                <div className="flex gap-1.5">{r.is_test && <Tag tone="test">Test order</Tag>}</div>
              </div>
              {r.title && <p className="font-semibold text-zinc-900">{r.title}</p>}
              {r.comment ? <p className="whitespace-pre-line text-[15px] text-zinc-800">{r.comment}</p> : <p className="text-sm text-zinc-500">No written review, just the stars.</p>}
              <p className="text-sm text-zinc-600">
                {r.customer_name} · {dualTime(r.created_at)?.uk}
                {r.product && (
                  <>
                    {' · '}
                    <a href={`/products/${r.product.slug}`} target="_blank" rel="noopener" className="font-semibold text-zinc-800">
                      {r.product.title}
                    </a>
                  </>
                )}
                {r.order && (
                  <>
                    {' · '}
                    <Link href={`/admin/orders/${r.order.id}`} className="font-semibold text-zinc-800">
                      {r.order.reference}
                    </Link>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                {r.is_approved ? (
                  <ActButton act={setReviewApproved.bind(null, r.id, false)} label="Hide from the shop" />
                ) : (
                  <ActButton act={setReviewApproved.bind(null, r.id, true)} label="Publish" tone="primary" />
                )}
                <ActButton act={deleteReview.bind(null, r.id)} label="Delete" tone="danger" confirm="Delete this review for good?" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
