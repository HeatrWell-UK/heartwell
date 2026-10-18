// /llms-full.txt: every product on sale with its price, size, cover and
// colours, in plain text, so an AI assistant answering "which sofas does
// Heartwell sell?" reads the live catalogue rather than guessing. Built from
// the same listing as the shop, so it never says anything the pages don't.

import { BRAND } from '@/config/brand'
import { PROMISES } from '@/config/promises'
import { SITE_URL } from '@/config/site'
import { getListing, rangesFrom } from '@/lib/catalogue/listing'
import type { ListingProduct } from '@/lib/catalogue/listing-types'
import { formatPrice } from '@/lib/format'
import { listingSize, materialWords } from '@/lib/seo/answers'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

export const revalidate = 3600

function productLines(p: ListingProduct): string[] {
  const size = listingSize(p)
  const colours = p.colours.map((c) => c.name)
  return [
    `### ${p.title}`,
    '',
    `- Link: ${SITE_URL}/products/${p.slug}`,
    `- Price: ${p.colours.length > 1 ? 'from ' : ''}${formatPrice(p.price)}, paid on delivery`,
    ...(size ? [`- Size: ${size}`] : []),
    ...(p.material ? [`- Cover: ${materialWords(p.material)}`] : []),
    ...(colours.length ? [`- Colours: ${colours.join(', ')}`] : []),
    ...(p.reclining ? [`- Reclining: ${p.reclining.toLowerCase()}`] : []),
    `- ${p.madeToOrder ? `Made to order${p.madeInUk ? ' in the UK' : ''}, in the colours shown or any fabric from the library` : 'Ready-made'}`,
    '',
  ]
}

export async function GET() {
  const listing = SUPABASE_CONFIGURED ? await getListing().catch(() => []) : []
  const ranges = rangesFrom(listing)
  const loose = listing.filter((p) => !p.rangeSlug)
  const lines = [
    `# ${BRAND.name}: every product`,
    '',
    `> ${BRAND.shortDescription}`,
    '',
    `Every piece on sale at ${SITE_URL}, by range, with its price, size and cover. ${PROMISES.delivery.long} ${PROMISES.delivery.timingLong} ${PROMISES.payment.long} The summary is at ${SITE_URL}/llms.txt.`,
    '',
    ...ranges.flatMap((r) => [
      `## ${r.name}`,
      '',
      `${r.description ?? ''}${r.description ? ' ' : ''}Range page: ${SITE_URL}/ranges/${r.slug}`,
      '',
      ...r.products.flatMap(productLines),
    ]),
    ...(loose.length ? ['## Other pieces', '', ...loose.flatMap(productLines)] : []),
  ]
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
