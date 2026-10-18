// /llms.txt (llmstxt.org): a plain summary of the shop for AI assistants,
// written from the same sources as the pages, so it never says something the
// site doesn't.

import { BRAND } from '@/config/brand'
import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import { POLICIES, PROMISES } from '@/config/promises'
import { SITE_URL } from '@/config/site'
import { allFaqItems, faqGroups } from '@/content/faq'
import { GUIDES } from '@/content/guides'
import { getCategories, getListing, rangesFrom, sentenceCase } from '@/lib/catalogue/listing'
import { categoryHref } from '@/lib/catalogue/tree'
import { formatPrice } from '@/lib/format'
import { getDeliveryInfo } from '@/lib/product/load'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

export const revalidate = 3600

export async function GET() {
  const [delivery, tree, listing] = SUPABASE_CONFIGURED
    ? await Promise.all([getDeliveryInfo().catch(() => null), getCategories().catch(() => []), getListing().catch(() => [])])
    : [null, [], []]
  const ranges = rangesFrom(listing)
  const url = (path: string) => `${SITE_URL}${path}`
  const a = CONTACT.visitAddress
  const lines = [
    `# ${BRAND.name}`,
    '',
    `> ${BRAND.shortDescription}`,
    '',
    `${BRAND.name} is an online sofa shop${a ? ` based in ${a.locality}, ${a.county}, England` : ''}. It sells sofas, corner sofas, U-shaped sofas, 3+2 sets, recliners, armchairs and footstools to households across mainland Britain, paid for in cash or by bank transfer on delivery. Key facts:`,
    '',
    `- Payment: ${PROMISES.payment.long} No card payments, no deposit and no finance.`,
    `- Delivery: ${PROMISES.delivery.long} ${PROMISES.delivery.timingLong}`,
    ...(delivery?.areas.length
      ? [`- Delivery charges: ${delivery.areas.map((d) => `${d.name} ${formatPrice(d.charge)}`).join(', ')}; these areas take ${PROMISES.delivery.chargedTiming}. Free everywhere else on the mainland.`]
      : []),
    '- Outside UK Mainland (Northern Ireland, islands, Isle of Wight): delivered by arrangement, quoted on WhatsApp.',
    `- Orders count once the customer taps Confirm on the link sent by email and WhatsApp.`,
    `- Returns: ${POLICIES.changeOfMindDays} days to change your mind on ready-made pieces; made-to-order pieces are exempt; faults always covered.`,
    `- Guarantee: ${PROMISES.guarantee.long}`,
    `- Contact: ${CONTACT.email}${CONTACT.phoneDisplay ? `, phone and WhatsApp ${CONTACT.phoneDisplay}` : ''}.`,
    ...(a ? [`- Visit: ${a.street}, ${a.locality} ${a.postcode}. ${visitHoursText()}. ${visitBookingText()}`] : []),
    '',
    '## Shop',
    '',
    ...tree.filter((c) => !c.parentId).flatMap((d) => [`- [${sentenceCase(d.name)}](${url(categoryHref(tree, d))})`, ...tree.filter((c) => c.parentId === d.id).map((c) => `  - [${sentenceCase(c.name)}](${url(categoryHref(tree, c))})`)]),
    `- [Ranges](${url('/ranges')})`,
    ...ranges.map((r) => `  - [${r.name}](${url(`/ranges/${r.slug}`)}): ${r.products.length} ${r.products.length === 1 ? 'piece' : 'pieces'} from ${formatPrice(r.price)}${r.madeToOrder ? ', made to order' : ', ready-made'}`),
    `- [Every product with its price, size and cover](${url('/llms-full.txt')})`,
    `- [Fabrics](${url('/fabrics')}): the fabric library for made-to-order sofas`,
    `- [Fabric samples](${url('/fabric-samples')})`,
    '',
    '## Help',
    '',
    `- [Delivery and returns](${url('/delivery-and-returns')})`,
    `- [Questions and answers](${url('/faq')})`,
    `- [Will it fit?](${url('/will-it-fit')}): measuring doors and rooms`,
    `- [Care guide](${url('/care-guide')})`,
    `- [Track an order](${url('/track-order')})`,
    `- [Contact](${url('/contact')})`,
    ...(a ? [`- [Visit us](${url('/visit-us')})`] : []),
    `- [About](${url('/about')})`,
    `- [Reviews](${url('/reviews')}): genuine reviews from customers only`,
    '',
    '## Guides',
    '',
    ...GUIDES.map((g) => `- [${g.title}](${url(`/guides/${g.slug}`)}): ${g.summary}`),
    '',
    '## Questions and answers',
    '',
    ...allFaqItems(faqGroups(delivery, { fabricCount: 0, sampleLimit: null })).flatMap((i) => [`### ${i.q}`, '', i.a, '']),
    '## Policies',
    '',
    `- [Terms of sale](${url('/terms')})`,
    `- [Privacy notice](${url('/privacy')})`,
    `- [Cookies](${url('/cookies')})`,
    '',
  ]
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
