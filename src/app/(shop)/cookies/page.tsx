import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/content/ContentPage'
import { CookieSettingsButton } from '@/components/tracking/CookieSettingsButton'
import { STORAGE_GROUPS } from '@/content/cookies'

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Every cookie and piece of browser storage the Heartwell shop uses, what it’s for, how long it lasts, and how to change your choice.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return (
    <ContentPage
      title="Cookies"
      intro={
        <p>
          Cookies and browser storage are small pieces of information the shop keeps on your phone or computer. Here’s every one we use, and why. Change
          your choice at any time in <CookieSettingsButton className="font-semibold text-velvet underline underline-offset-2" />.
        </p>
      }
      updated="2026-10-12"
      contents={STORAGE_GROUPS.map((g) => ({ id: g.id, label: g.title }))}
    >
      <p>
        When you first visit, we ask before Google Analytics or Meta’s Pixel can run, with equal buttons to accept or reject. Our own visit statistics are
        on unless you switch them off: UK law (the Data (Use and Access) Act 2025) allows a shop to keep statistics for itself this way, as long as it’s
        easy to say no. More about how we use information is in our <Link href="/privacy">privacy notice</Link>.
      </p>
      {STORAGE_GROUPS.map((g) => (
        <section key={g.id} aria-labelledby={g.id} className="flex flex-col gap-3">
          <h2 id={g.id}>{g.title}</h2>
          <p>{g.intro}</p>
          <ul className="list-none pl-0">
            {g.items.map((i) => (
              <li key={i.name} className="flex flex-col gap-0.5 border-b border-line pb-3">
                <span>
                  <strong className="font-mono text-[15px]">{i.name}</strong> <span className="text-sm text-slate">({i.kind})</span>
                </span>
                <span>{i.purpose}</span>
                <span className="text-sm text-slate">Lasts: {i.lasts}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <h2 id="elsewhere">When you leave our site</h2>
      <p>
        WhatsApp, Google Maps and Apple Maps open in their own apps or websites, under their own cookie and privacy rules. You can also clear or block
        cookies and storage in your browser’s settings; the basket and saved sofas won’t survive that, but everything else works.
      </p>
    </ContentPage>
  )
}
