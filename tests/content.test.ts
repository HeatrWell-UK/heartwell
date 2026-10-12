import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTACT, visitBookingText, visitHoursText } from '@/config/contact'
import { POLICIES } from '@/config/promises'
import { LISTED_NAMES, STORAGE_GROUPS } from '@/content/cookies'
import { allFaqItems, faqGroups } from '@/content/faq'
import { GUIDES } from '@/content/guides'
import { organizationJsonLd, returnPolicy } from '@/lib/product/seo'

const SRC = join(__dirname, '..', 'src')
const SHOP = join(SRC, 'app', '(shop)')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

/** Does a shop link lead to a page we have? Category and product pages are dynamic, so their prefixes count. */
function pageExists(href: string): boolean {
  const [path = '', anchor] = href.split('#')
  if (/^\/sofas(\/[a-z0-9-]+)?$/.test(path) || path.startsWith('/products/')) return true
  const page = join(SHOP, ...path.split('/').filter(Boolean), 'page.tsx')
  if (!existsSync(page)) return false
  return anchor ? readFileSync(page, 'utf8').includes(`id: '${anchor}'`) || readFileSync(page, 'utf8').includes(`id="${anchor}"`) : true
}

const FACTS = { upstairsFirstFloor: 20, upstairsPerExtraFloor: 10, assemblyFee: 20, removalPerSeat: 10 }

describe('cookies page', () => {
  it('lists every hw- cookie and storage key the code uses', () => {
    const used = new Set<string>()
    for (const file of files(SRC)) {
      if (file.includes(`${join('content', 'cookies.ts')}`)) continue
      for (const m of readFileSync(file, 'utf8').matchAll(/['"`](hw-[a-z0-9-]+)['"`]/g)) used.add(m[1]!)
    }
    // Not storage: CSS classes.
    for (const cssClass of ['hw-sheet', 'hw-prose']) used.delete(cssClass)
    expect([...used].filter((k) => !LISTED_NAMES.includes(k))).toEqual([])
  })

  it('lists each item once, with what it’s for and how long it lasts', () => {
    expect(new Set(LISTED_NAMES).size).toBe(LISTED_NAMES.length)
    for (const g of STORAGE_GROUPS) for (const i of g.items) expect(i.purpose.length > 10 && i.lasts.length > 3).toBe(true)
  })
})

describe('questions and answers', () => {
  const groups = faqGroups(FACTS, { fabricCount: 70, sampleLimit: 5 })
  const items = allFaqItems(groups)

  it('quotes the shop’s own figures and never prints a gap', () => {
    const text = items.map((i) => i.a).join(' ')
    expect(text).toContain('£20 for the first floor')
    expect(text).toContain(`£${POLICIES.missedDeliveryCharge} re-delivery charge`)
    expect(text).toContain(`${POLICIES.changeOfMindDays} days from delivery`)
    expect(text).toContain('our 70 fabrics')
    expect(text).not.toMatch(/undefined|null|NaN|\[object/)
  })

  it('leaves out price answers when the settings can’t be read', () => {
    const ids = allFaqItems(faqGroups(null, { fabricCount: 0, sampleLimit: null })).map((i) => i.id)
    expect(ids).not.toContain('upstairs')
    expect(ids).toContain('how-pay')
  })

  it('has unique questions, and every link goes to a real page', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    for (const i of items) if (i.link) expect(pageExists(i.link.href), i.link.href).toBe(true)
  })

  it('offers a visit only while there’s an address', () => {
    expect(items.some((i) => i.id === 'visit')).toBe(CONTACT.visitAddress !== null)
  })
})

describe('guides', () => {
  it('have unique, clean addresses and real next steps', () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length)
    expect(GUIDES.length).toBeGreaterThanOrEqual(4)
    for (const g of GUIDES) {
      expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(g.sections.length).toBeGreaterThanOrEqual(2)
      for (const n of g.next) expect(pageExists(n.href), `${g.slug} → ${n.href}`).toBe(true)
    }
  })

  it('never promise payment in advance or card payments', () => {
    const text = JSON.stringify(GUIDES)
    expect(text).not.toMatch(/pay (online|by card|a deposit)/i)
  })
})

describe('policy pages and links', () => {
  it('exist for every footer and help link', async () => {
    const { HELP_LINKS, ABOUT_LINKS, LEGAL_LINKS, BROWSE_LINKS } = await import('@/config/navigation')
    for (const l of [...HELP_LINKS, ...ABOUT_LINKS, ...LEGAL_LINKS, ...BROWSE_LINKS]) expect(pageExists(l.href), l.href).toBe(true)
  })

  it('describe a visit in plain words', () => {
    expect(visitHoursText({ hours: '9am to 5pm', days: [], opens: '09:00', closes: '17:00', bookAheadDays: 1 })).toBe('9am to 5pm')
    expect(visitHoursText({ hours: '9am to 5pm', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00', bookAheadDays: 1 })).toBe(
      'Monday to Friday, 9am to 5pm',
    )
    expect(visitBookingText({ hours: '', days: [], opens: '', closes: '', bookAheadDays: 1 })).toBe('By appointment only: book at least a day ahead.')
    expect(visitBookingText({ hours: '', days: [], opens: '', closes: '', bookAheadDays: 2 })).toBe('By appointment only: book at least 2 days ahead.')
  })
})

describe('structured data', () => {
  it('describes returns honestly: 14 days for ready-made pieces, none for made to order', () => {
    expect(returnPolicy(false)).toMatchObject({ returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: POLICIES.changeOfMindDays })
    expect(returnPolicy(true)).toMatchObject({ returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted' })
  })

  it('names the shop, its contact details and (once set) its address', () => {
    const org = organizationJsonLd('https://heartwellfurniture.co.uk')
    expect(org).toMatchObject({ '@type': 'Organization', name: 'Heartwell', email: CONTACT.email })
    if (CONTACT.visitAddress) expect(org.address).toMatchObject({ postalCode: CONTACT.visitAddress.postcode, addressCountry: 'GB' })
    expect(JSON.stringify(org)).not.toMatch(/undefined|null/)
  })
})

describe('order confirmation email', () => {
  it('states the change-of-mind rule, with the made-to-order exemption when it applies', async () => {
    const { returnsLine } = await import('@/lib/email/order-emails')
    expect(returnsLine(false)).toBe(`Ready-made pieces can be returned within ${POLICIES.changeOfMindDays} days of delivery if you change your mind. Faults are always covered.`)
    expect(returnsLine(true)).toMatch(/^Your order includes a made-to-order piece, made for you, so it can’t be returned for a change of mind\./)
  })

  it('says who we are and where, with links to the policies', async () => {
    const { emailFooter, emailFooterText } = await import('@/lib/email/layout')
    for (const footer of [emailFooter(), emailFooterText()]) {
      expect(footer).toContain('Heartwell')
      expect(footer).toContain('/delivery-and-returns')
      expect(footer).toContain('/terms')
      if (CONTACT.visitAddress) expect(footer).toContain(CONTACT.visitAddress.postcode)
    }
  })
})
