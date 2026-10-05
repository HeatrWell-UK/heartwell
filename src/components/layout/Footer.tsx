import Link from 'next/link'
import { LogoStacked } from '@/components/brand/Logo'
import { CONTACT, phoneHref } from '@/config/contact'
import { ABOUT_LINKS, BROWSE_LINKS, HELP_LINKS, LEGAL_LINKS } from '@/config/navigation'
import type { NavSection } from '@/lib/catalogue/listing'

const linkClass = 'text-[15px] text-on-wine-link no-underline hover:text-white hover:underline'

/** Wine footer with the gold logo. Contact and company lines appear only once set in config. */
export function Footer({ shop }: { shop: NavSection[] }) {
  const t = CONTACT.trading
  const tel = phoneHref()
  const year = new Date().getFullYear()
  return (
    <footer className="bg-wine text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-8 pt-10 lg:px-6">
        <LogoStacked reversed width={190} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
          {/* Shape categories and the department link; fabric and leather are in the menu. */}
          <FooterColumn
            title="Shop"
            links={[...(shop[0]?.links ?? []).filter((l) => !/fabric|leather/.test(l.href)), BROWSE_LINKS[0]!]}
          />
          <FooterColumn title="Help" links={HELP_LINKS} />
          <FooterColumn title="Heartwell" links={ABOUT_LINKS} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-bold">Talk to us</span>
          {CONTACT.phoneDisplay && tel && (
            <a href={tel} className={linkClass}>
              {CONTACT.phoneDisplay}
            </a>
          )}
          <a href={`mailto:${CONTACT.email}`} className={linkClass}>
            {CONTACT.email}
          </a>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 pt-5">
          {t.companyName && (
            <p className="text-[13px] leading-relaxed text-on-wine-muted">
              {t.companyName} trading as Heartwell.
              {t.companyNumber && ` Registered in England and Wales, company number ${t.companyNumber}.`}
              {t.registeredOffice && ` Registered office: ${t.registeredOffice}.`}
              {t.vatNumber && ` VAT number ${t.vatNumber}.`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-[13px] text-on-wine-link">
                {l.label}
              </Link>
            ))}
            <span className="text-[13px] text-on-wine-muted">© {year} Heartwell</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[15px] font-bold">{title}</span>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={linkClass}>
          {l.label}
        </Link>
      ))}
    </div>
  )
}
