import Link from 'next/link'
import { FacebookLogoIcon, InstagramLogoIcon, TiktokLogoIcon } from '@phosphor-icons/react/ssr'
import { LogoStacked } from '@/components/brand/Logo'
import { CONTACT, phoneHref, type SocialProfile } from '@/config/contact'
import { ABOUT_LINKS, BROWSE_LINKS, HELP_LINKS, LEGAL_LINKS } from '@/config/navigation'
import type { NavSection } from '@/lib/catalogue/listing'
import { NewsletterSignup } from './NewsletterSignup'
import { CookieSettingsButton } from '@/components/tracking/CookieSettingsButton'
import { TelLink } from '@/components/tracking/TelLink'

const linkClass = 'text-[15px] text-on-wine-link no-underline hover:text-white hover:underline'

const SOCIAL_ICONS: Record<SocialProfile['platform'], typeof FacebookLogoIcon> = {
  facebook: FacebookLogoIcon,
  instagram: InstagramLogoIcon,
  tiktok: TiktokLogoIcon,
}

/** Wine footer with the gold logo. Contact, address and company lines appear only once set in config. */
export function Footer({ shop }: { shop: NavSection[] }) {
  const t = CONTACT.trading
  const a = CONTACT.visitAddress
  const tel = phoneHref()
  const year = new Date().getFullYear()
  return (
    <footer className="bg-wine text-white">
      {/* Room at the bottom for the floating WhatsApp button, so it never sits on the last line. */}
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 pb-24 pt-10 lg:gap-12 lg:px-6 lg:pt-16">
        <div className="grid gap-8 lg:grid-cols-[4fr_7fr_4fr] lg:gap-12">
          <div className="flex flex-col gap-8">
            <LogoStacked reversed width={190} />
            <div className="flex flex-col gap-2">
              <span className="text-[15px] font-bold">Talk to us</span>
              {CONTACT.phoneDisplay && tel && (
                <TelLink href={tel} className={linkClass}>
                  {CONTACT.phoneDisplay}
                </TelLink>
              )}
              <a href={`mailto:${CONTACT.email}`} className={linkClass}>
                {CONTACT.email}
              </a>
              {a && (
                <Link href="/visit-us" className={linkClass}>
                  {a.street}, {a.locality} {a.postcode} <span className="text-on-wine-muted">(visits by appointment)</span>
                </Link>
              )}
            </div>
            {CONTACT.socials.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-bold">Follow us</span>
                <ul className="-ml-2.5 flex gap-1">
                  {CONTACT.socials.map((s) => {
                    const Icon = SOCIAL_ICONS[s.platform]
                    return (
                      <li key={s.platform}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener"
                          aria-label={`Heartwell on ${s.label} (opens in a new tab)`}
                          className="flex size-11 items-center justify-center rounded-full text-on-wine-link hover:bg-white/10 hover:text-white"
                        >
                          <Icon size={26} aria-hidden="true" />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:pt-1">
            {/* Shape categories and the department link; fabric and leather are in the menu. */}
            <FooterColumn
              title="Shop"
              links={[...(shop[0]?.links ?? []).filter((l) => !/fabric|leather/.test(l.href)), BROWSE_LINKS[0]!]}
            />
            <FooterColumn title="Help" links={HELP_LINKS} />
            <FooterColumn title="Heartwell" links={ABOUT_LINKS} />
          </div>

          <div className="lg:pt-1">
            <NewsletterSignup />
          </div>
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
            <CookieSettingsButton className="text-[13px] text-on-wine-link underline underline-offset-2" />
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
