import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContentPage, Note } from '@/components/content/ContentPage'
import { BRAND } from '@/config/brand'
import { SITE_URL } from '@/config/site'
import { GUIDES, guideBySlug, type GuideBlock } from '@/content/guides'
import { jsonLdString } from '@/lib/product/seo'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = guideBySlug((await params).slug)
  if (!guide) return {}
  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: 'article', title: guide.title, description: guide.summary, url: `/guides/${guide.slug}` },
  }
}

function Block({ block }: { block: GuideBlock }) {
  if ('p' in block) return <p>{block.p}</p>
  if ('list' in block)
    return (
      <ul>
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  if ('steps' in block)
    return (
      <ol className="hw-steps">
        {block.steps.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    )
  return <Note title={block.note.title}>{block.note.text}</Note>
}

export default async function GuidePage({ params }: Props) {
  const guide = guideBySlug((await params).slug)
  if (!guide) notFound()
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.summary,
    dateModified: guide.updated,
    author: { '@type': 'Organization', name: BRAND.name, url: SITE_URL },
    publisher: { '@type': 'Organization', name: BRAND.name, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/guides/${guide.slug}`,
  }
  return (
    <ContentPage
      title={guide.title}
      intro={<p>{guide.summary}</p>}
      updated={guide.updated}
      crumbs={[{ name: 'Guides', href: '/guides' }]}
      contents={guide.sections.map((s) => ({ id: s.id, label: s.heading }))}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(article) }} />
      {guide.sections.map((s) => (
        <section key={s.id} aria-labelledby={s.id} className="flex flex-col gap-4">
          <h2 id={s.id}>{s.heading}</h2>
          {s.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </section>
      ))}
      <nav aria-labelledby="next" className="flex flex-col gap-2 border-t border-line pt-5">
        <h2 id="next" className="mt-0 font-sans text-[17px] font-bold tracking-normal">
          Next
        </h2>
        <ul>
          {guide.next.map((n) => (
            <li key={n.href}>
              <Link href={n.href}>{n.label}</Link>
            </li>
          ))}
          <li>
            <Link href="/guides">All guides</Link>
          </li>
        </ul>
      </nav>
    </ContentPage>
  )
}
