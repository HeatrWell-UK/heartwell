import Link from 'next/link'
import { Accordion } from '@/components/ui/Accordion'
import { faqJsonLd, type Answer } from '@/lib/seo/answers'
import { jsonLdString } from '@/lib/product/seo'

/**
 * Questions with short answers, in the same native panels as the FAQ page
 * (indexed by search engines and found by "Find in page"). With `structured`
 * the same questions go to search engines as FAQ data: only ever the ones on
 * screen.
 */
export function QuestionList({
  id,
  title,
  items,
  structured = false,
  className = '',
}: {
  id: string
  title: string
  items: Answer[]
  structured?: boolean
  className?: string
}) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-4 ${className}`}>
      {structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd(items)) }} />}
      <h2 id={id} className="text-[26px] leading-tight lg:text-[32px]">
        {title}
      </h2>
      <Accordion
        name={id}
        items={items.map((i) => ({
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
  )
}
