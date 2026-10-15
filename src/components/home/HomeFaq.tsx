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
    <section
      aria-labelledby="faq"
      className="mx-auto grid max-w-[1200px] gap-6 px-4 pt-14 lg:grid-cols-[5fr_6fr] lg:gap-16 lg:px-6 lg:pt-24"
    >
      <div className="flex flex-col gap-3 lg:pt-1">
        <h2 id="faq" className="text-[30px] leading-tight lg:text-[42px]">
          Questions people ask
        </h2>
        <Link href="/faq" className="hidden self-start text-[16px] font-semibold lg:block">
          All questions and answers
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        <Accordion items={items} name="home-faq" />
        <Link href="/faq" className="self-start text-[16px] font-semibold lg:hidden">
          All questions and answers
        </Link>
      </div>
    </section>
  )
}
