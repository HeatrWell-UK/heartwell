import Link from 'next/link'
import { Accordion } from '@/components/ui/Accordion'
import { allFaqItems, faqGroups } from '@/content/faq'
import type { DeliveryInfo } from '@/lib/product/types'

/** The questions first-time visitors ask most, from the same answers as the FAQ page. */
const HOME_QUESTIONS = ['how-pay', 'when', 'where', 'fabric', 'upstairs', 'change-mind']

/** "Questions people ask": short answers from the single sources (promises and shop settings). */
export function HomeFaq({ delivery, fabricCount }: { delivery: DeliveryInfo | null; fabricCount: number }) {
  const all = allFaqItems(faqGroups(delivery, { fabricCount, sampleLimit: null }))
  const items = HOME_QUESTIONS.flatMap((id) => all.filter((i) => i.id === id)).map((i, n) => ({
    title: i.q,
    open: n === 0,
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
  }))
  return (
    <section aria-labelledby="faq" className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-12 lg:px-6 lg:pt-20">
      <h2 id="faq" className="text-[28px] leading-tight lg:text-[34px]">
        Questions people ask
      </h2>
      <div className="flex max-w-[46rem] flex-col gap-4">
        <Accordion items={items} name="home-faq" />
        <Link href="/faq" className="self-start text-[15px] font-semibold">
          All questions and answers
        </Link>
      </div>
    </section>
  )
}
