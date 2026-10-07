'use server'

import { z } from 'zod'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { createPublicClient } from '@/lib/supabase/public'

// A review from the private link in the review email. The link's token is the
// proof of purchase; the database checks it, the order is delivered and the
// product was in it, and holds every review until the shop approves it.

export type ReviewResult = { ok: true } | { ok: false; message: string }

const Input = z.object({
  token: z.uuid(),
  productId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120),
  comment: z.string().trim().max(2000),
  name: z.string().trim().max(80),
})

const MESSAGES: Record<string, string> = {
  INVALID_LINK: 'That review link doesn’t work. Please use the button in our email.',
  NOT_DELIVERED: 'You can review your order once it’s been delivered.',
  NOT_IN_ORDER: 'That product isn’t in this order.',
  BAD_RATING: 'Please choose a star rating.',
  ALREADY_REVIEWED: 'You’ve already reviewed this one. Thank you!',
}

export async function submitReview(input: unknown): Promise<ReviewResult> {
  const parsed = Input.safeParse(input)
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0]
    return { ok: false, message: field === 'rating' ? MESSAGES.BAD_RATING! : 'Please check your review and try again.' }
  }
  if (!rateLimit(`review:${await clientIp()}`, 15, 60 * 60_000)) return { ok: false, message: 'Please try again in a little while.' }
  const r = parsed.data
  const { error } = await createPublicClient().rpc('submit_review', {
    p_token: r.token,
    p_product_id: r.productId,
    p_rating: r.rating,
    p_title: r.title,
    p_comment: r.comment,
    p_name: r.name,
  })
  if (error) {
    const code = error.message.match(/^([A-Z_]+)/)?.[1] ?? ''
    if (!MESSAGES[code]) console.error('review not saved', error.message)
    return { ok: false, message: MESSAGES[code] ?? 'We couldn’t save your review. Please try again.' }
  }
  return { ok: true }
}
