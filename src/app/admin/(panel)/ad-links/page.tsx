import type { Metadata } from 'next'
import { ArrowSquareOutIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react/ssr'
import { Card } from '@/components/admin/Fields'
import { CopyButton } from '@/components/admin/ClientButtons'
import { SITE_URL } from '@/config/site'
import { adLink, FEED_LABELS, META_URL_PARAMETERS, PROFILE_LINKS, profileLink, testAdLink } from '@/lib/admin/ad-links'
import { loadAdLinks, type FeedFetch } from '@/lib/admin/load-ad-links'
import { dualTime } from '@/lib/admin/orders'
import { LEFT_OUT_LABEL } from '@/lib/catalogue/feed'
import { productHref } from '@/lib/product/helpers'

export const metadata: Metadata = { title: 'Ad links' }
export const dynamic = 'force-dynamic'

/** A link with its copy button. The address wraps rather than overflowing a phone screen. */
function LinkRow({ label, href, copyLabel = 'Copy link' }: { label: string; href: string; copyLabel?: string }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <p className="break-all font-mono text-xs text-zinc-500">{href}</p>
      </div>
      <CopyButton text={href} label={copyLabel} className="shrink-0 self-start sm:self-center" />
    </li>
  )
}

function lastFetch(fetches: FeedFetch[]) {
  const meta = fetches.find((f) => f.agent === 'meta')
  const other = fetches.filter((f) => f.agent !== 'meta').sort((a, b) => b.last.localeCompare(a.last))[0]
  return { meta, other }
}

export default async function AdLinksPage() {
  const { feedUrl, feed, fetches, ranges } = await loadAdLinks()
  const { meta, other } = lastFetch(fetches)
  const metaAt = dualTime(meta?.last)
  const otherAt = dualTime(other?.last)
  const leftOutCount = feed.leftOut.reduce((n, g) => n + g.colours.length, 0)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">Ad links</h1>
        <p className="text-[15px] text-zinc-600">
          The catalogue feed for Meta, and ready-made links for your ads and profiles. Ad links mark the visit as coming from an ad, so the visitor gets the ad offer and every sale shows its campaign and ad in the admin.
        </p>
      </header>

      <Card
        title="Catalogue feed for Meta"
        intro="Every colourway with its own photo, priced from the database, with the same IDs the Pixel sends. In Commerce Manager, add it as a data feed on a schedule (hourly) and connect the Pixel to the catalogue."
      >
        <ul className="divide-y divide-zinc-100">
          <LinkRow label="Feed address" href={feedUrl} copyLabel="Copy address" />
        </ul>
        <a href="/feeds/meta-catalogue.xml" target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 self-start text-sm font-semibold text-zinc-700 underline underline-offset-2">
          Open this site’s feed <ArrowSquareOutIcon aria-hidden="true" size={16} />
        </a>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <dt className="text-zinc-500">In the feed</dt>
            <dd className="text-lg font-bold text-zinc-900">
              {feed.items} {feed.items === 1 ? 'item' : 'items'}
            </dd>
            <dd className="text-zinc-600">from {feed.products} products</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <dt className="text-zinc-500">Left out</dt>
            <dd className="text-lg font-bold text-zinc-900">{leftOutCount}</dd>
            <dd className="text-zinc-600">{leftOutCount ? 'see below' : 'nothing'}</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <dt className="text-zinc-500">Meta last fetched it</dt>
            {metaAt && meta ? (
              <>
                <dd className="flex items-center gap-1.5 font-bold text-zinc-900">
                  <CheckCircleIcon aria-hidden="true" size={18} weight="fill" className="text-emerald-600" /> {metaAt.uk} UK
                </dd>
                <dd className="text-zinc-600">
                  {metaAt.pk} PK · {meta.items} items · {meta.count} {meta.count === 1 ? 'fetch' : 'fetches'} so far
                </dd>
              </>
            ) : (
              <>
                <dd className="font-bold text-zinc-900">Not yet</dd>
                <dd className="text-zinc-600">Shows here once Commerce Manager fetches it.</dd>
              </>
            )}
          </div>
        </dl>
        {otherAt && other && (
          <p className="text-sm text-zinc-600">
            Last opened by {other.agent === 'google' ? 'Google' : 'someone else (a browser or checker)'}: {otherAt.uk} UK ({otherAt.pk} PK).
          </p>
        )}
        {feed.leftOut.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <WarningIcon aria-hidden="true" size={18} /> Left out until they have photos
            </p>
            <ul className="flex flex-col gap-1 text-sm text-amber-900">
              {feed.leftOut.map((g) => (
                <li key={`${g.slug}:${g.reason}`}>
                  <span className="font-semibold">{g.productTitle}</span>: {g.colours.join(', ')} ({LEFT_OUT_LABEL[g.reason].toLowerCase()})
                </li>
              ))}
            </ul>
            <p className="text-sm text-amber-900">Add each colour’s photo in Catalogue and it joins the feed within 15 minutes.</p>
          </div>
        )}
        <details className="rounded-lg ring-1 ring-zinc-200">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-zinc-800">Labels for product sets</summary>
          <div className="flex flex-col gap-2 px-3 pb-3 text-sm text-zinc-700">
            <p>In Commerce Manager → Catalogue → Sets, filter by these to make sets such as “Corner sofas under £750” or “Offer high”. The category is in product type.</p>
            <ul className="flex flex-col gap-1">
              {FEED_LABELS.map((l) => (
                <li key={l.label}>
                  <span className="font-mono text-xs text-zinc-900">{l.label}</span>: {l.holds} (e.g. {l.example})
                </li>
              ))}
            </ul>
          </div>
        </details>
      </Card>

      <Card
        title="URL parameters for every ad"
        intro="In Ads Manager, open the ad, and under Destination → URL parameters paste this once. Catalogue ads too. Meta fills in the campaign, ad set and ad names, and the admin shows them on each order."
      >
        <ul className="divide-y divide-zinc-100">
          <LinkRow label="URL parameters" href={META_URL_PARAMETERS} copyLabel="Copy parameters" />
        </ul>
      </Card>

      <Card
        title="Links for your ads"
        intro="Paste one as the ad’s website address. Each already says it’s from an ad, so the offer works even if the URL parameters are missed; with them, the ad’s own names are recorded."
      >
        <ul className="divide-y divide-zinc-100">
          <LinkRow label="Home page" href={adLink(SITE_URL, '/', 'home')} />
          <LinkRow label="All sofas" href={adLink(SITE_URL, '/sofas', 'sofas')} />
        </ul>
        {ranges.map((r) => (
          <details key={r.slug ?? 'loose'} className="rounded-lg ring-1 ring-zinc-200">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm font-semibold text-zinc-800">
              {r.name}
              <span className="font-normal text-zinc-500">
                {r.products.length} {r.products.length === 1 ? 'product' : 'products'}
              </span>
            </summary>
            <ul className="divide-y divide-zinc-100 px-3">
              {r.slug && <LinkRow label={`${r.name}: the whole range`} href={adLink(SITE_URL, `/ranges/${r.slug}`, r.slug)} />}
              {r.products.map((p) => (
                <li key={p.slug} className="py-1">
                  <ul className="divide-y divide-zinc-100">
                    <LinkRow label={p.title} href={adLink(SITE_URL, productHref(p.slug), r.slug ?? p.slug)} />
                    {p.colours.length > 1 &&
                      p.colours.map((c) => <LinkRow key={c.sku} label={`${p.title}, ${c.name ?? c.sku}`} href={adLink(SITE_URL, productHref(p.slug, c.sku), r.slug ?? p.slug)} />)}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </Card>

      <Card title="Links for your profiles" intro="Not ads, so no offer, but the admin still shows which profile a visitor came from.">
        <ul className="divide-y divide-zinc-100">
          {PROFILE_LINKS.map((l) => (
            <LinkRow key={l.label} label={l.label} href={profileLink(SITE_URL, l.source, l.campaign)} />
          ))}
        </ul>
      </Card>

      <Card title="Try it on your phone" intro="Opens like an ad, so the offer appears on product pages, in the basket and at checkout, but the visit and any order never count (it ends in qa=1). Send it to yourself on Instagram and open it there.">
        <ul className="divide-y divide-zinc-100">
          <LinkRow label="Test ad link" href={testAdLink(SITE_URL, '/sofas')} />
        </ul>
      </Card>
    </div>
  )
}
