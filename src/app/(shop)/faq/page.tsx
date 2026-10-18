import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/content/ContentPage'
import { Accordion } from '@/components/ui/Accordion'
import { allFaqItems, faqGroups } from '@/content/faq'
import { getFabricLibrary } from '@/lib/catalogue/listing'
import { getDeliveryInfo, getSampleLimit } from '@/lib/product/load'
import { jsonLdString } from '@/lib/product/seo'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Questions and answers: paying, delivery, returns',
  description: 'How paying cash on delivery works, delivery times and extras, returns, the guarantee, fabrics and samples: straight answers from Heartwell.',
  alternates: { canonical: '/faq' },
}

export default async function FaqPage() {
  const [delivery, fabrics, sampleLimit] = SUPABASE_CONFIGURED
    ? await Promise.all([getDeliveryInfo().catch(() => null), getFabricLibrary().catch(() => []), getSampleLimit().catch(() => null)])
    : [null, [], null]
  const groups = faqGroups(delivery, { fabricCount: fabrics.reduce((n, c) => n + c.fabrics.length, 0), sampleLimit })
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqItems(groups).map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  }

  return (
    <ContentPage
      title="Questions and answers"
      intro={
        <p>
          The things people ask before they order. Anything else? <Link href="/contact">Ask us</Link>, WhatsApp is quickest.
        </p>
      }
      contents={groups.map((g) => ({ id: g.id, label: g.title }))}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(structured) }} />
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={g.id} className="flex flex-col gap-3">
          <h2 id={g.id}>{g.title}</h2>
          <Accordion
            name={`faq-${g.id}`}
            items={g.items.map((i) => ({
              title: i.q,
              content: (
                <>
                  <p>{i.a}</p>
                  {i.link && (
                    <p>
                      <Link href={i.link.href}>{i.link.label}</Link>
                    </p>
                  )}
                </>
              ),
            }))}
          />
        </section>
      ))}
    </ContentPage>
  )
}
