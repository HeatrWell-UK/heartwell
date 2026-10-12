import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/content/ContentPage'
import { CookieSettingsButton } from '@/components/tracking/CookieSettingsButton'
import { CONTACT } from '@/config/contact'

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'What Heartwell collects when you order, enquire or browse, why, who helps us, how long we keep it and your rights.',
  alternates: { canonical: '/privacy' },
}

const CONTENTS = [
  { id: 'who', label: 'Who we are' },
  { id: 'orders', label: 'When you order' },
  { id: 'enquiries', label: 'Enquiries, samples, reminders and the newsletter' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'browsing', label: 'When you browse' },
  { id: 'advertising', label: 'Advertising on Facebook and Instagram' },
  { id: 'sharing', label: 'Who helps us' },
  { id: 'keeping', label: 'How long we keep it' },
  { id: 'rights', label: 'Your rights' },
  { id: 'changes', label: 'Changes to this notice' },
]

export default function PrivacyPage() {
  const t = CONTACT.trading
  const a = CONTACT.visitAddress
  const who = t.companyName ? `${t.companyName}, trading as Heartwell` : 'Heartwell'
  return (
    <ContentPage
      title="Privacy notice"
      intro={<p>We collect only what we need to sell and deliver your furniture and to run the shop well, and we never sell your details.</p>}
      updated="2026-10-12"
      contents={CONTENTS}
    >
      <h2 id="who">Who we are</h2>
      <p>
        {who} is responsible for your personal information (the “controller”).
        {t.companyNumber ? ` Company number ${t.companyNumber}.` : ''}
        {t.registeredOffice ? ` Registered office: ${t.registeredOffice}.` : ''} For anything about your information, email{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        {CONTACT.phoneDisplay ? `, ring ${CONTACT.phoneDisplay}` : ''}
        {a ? ` or write to us at ${a.street}, ${a.locality} ${a.postcode}` : ''}.
      </p>

      <h2 id="orders">When you order</h2>
      <p>
        We need your name, mobile number, email address, delivery address and postcode, and the details of your order (pieces, extras, any preferred
        delivery day and notes). We use them to take, confirm and deliver your order, to keep you updated by email, WhatsApp, text or phone, to take payment
        on delivery, and to deal with returns, faults and the guarantee. The legal basis is our contract with you; we keep the records afterwards because tax
        law requires it.
      </p>
      <p>
        With your order we also keep how you found us: campaign tags from the link you followed, the page you landed on, the website you came from, and a
        random ID for your device. It tells us which adverts bring real customers. You can switch this off in <CookieSettingsButton className="font-semibold text-velvet underline underline-offset-2" />.
      </p>

      <h2 id="enquiries">Enquiries, samples, reminders and the newsletter</h2>
      <ul>
        <li>
          <strong>WhatsApp, phone and email:</strong> we use what you send us to answer you. When you tap a WhatsApp button on our site we add a short
          reference (like HW-WA-…) to the message and note which page you were on, so we can help you with the right sofa. WhatsApp is run by Meta under its
          own privacy policy.
        </li>
        <li>
          <strong>Contact form:</strong> your name, contact details and message, to answer you.
        </li>
        <li>
          <strong>Fabric samples:</strong> your name, contact details and address, to arrange and post them. We also note your connection’s IP address and
          browser to stop misuse.
        </li>
        <li>
          <strong>Basket reminders:</strong> only if you tick the box at checkout, we keep your contact details and basket to send you one reminder. That’s
          based on your consent, which you can withdraw at any time.
        </li>
        <li>
          <strong>Newsletter:</strong> only after you confirm by email (we keep a record of when and from which connection you agreed). Every email has an
          unsubscribe link.
        </li>
      </ul>

      <h2 id="reviews">Reviews</h2>
      <p>
        After delivery we email you a private link to review what you bought. If you write one, we publish your rating, your words and the name you give,
        and link it to your order so we know it’s genuine. Ask us and we’ll take it down.
      </p>

      <h2 id="browsing">When you browse</h2>
      <p>
        Our own statistics (which pages and campaigns bring visitors, and which visits lead to orders) are on unless you switch them off, as UK law now
        allows for statistics a shop keeps for itself. Google Analytics and Meta’s Pixel only run if you accept them. You can change your mind at any time in{' '}
        <CookieSettingsButton className="font-semibold text-velvet underline underline-offset-2" />, and our <Link href="/cookies">cookies page</Link> lists
        everything we store on your device.
      </p>
      <p>
        Your basket, saved sofas and the postcode you checked stay on your device; we don’t keep them unless you order or ask for a reminder. Like every
        website’s, our host’s servers see your connection’s IP address; we use it briefly to stop abuse, and only add it to your records where this notice
        says so.
      </p>

      <h2 id="advertising">Advertising on Facebook and Instagram</h2>
      <p>
        We advertise on Facebook and Instagram, and we tell Meta when an advert leads to a confirmed order, so we can see which adverts work and show them
        to people likely to be interested. When you confirm an order (and again when it’s delivered), we send Meta its value and what was bought, with your
        email address, phone number, name, postcode, town and your device’s random ID in a scrambled (hashed) form that Meta can only match against people
        it already knows. We never send order numbers, links to your order or anything unscrambled.
      </p>
      <p>
        We also tell Google Analytics the value and pieces of each confirmed order, with no personal details, so our sales figures add up. If you didn’t
        accept Analytics cookies, it goes with a random one-off ID instead of yours.
      </p>
      <p>
        We do this because it’s in our legitimate interest to know which adverts work; you can object, and we’ll stop. If you accepted marketing cookies,
        we also include your IP address, browser and Meta’s own cookie IDs, which helps Meta match the order. Test orders and cancelled orders are never
        sent.
      </p>
      <p>
        If you arrived from one of our adverts, the shop remembers it for up to a week (two small cookies) so your ad offer applies at checkout. That
        doesn’t depend on your cookie choices, because it’s part of the offer you were shown.
      </p>

      <h2 id="sharing">Who helps us</h2>
      <p>We share only what each needs, under contracts that protect it:</p>
      <ul>
        <li>our delivery team and the order system they use, to deliver your order;</li>
        <li>Supabase, which hosts our database in London;</li>
        <li>our website host, and Hostinger, which runs our email;</li>
        <li>Cloudinary, which stores and serves our photos and videos;</li>
        <li>Meta (WhatsApp, and advertising measurement as above) and Google (Analytics, only if you accept);</li>
        <li>an address-finder service, which sees the postcode you type at checkout;</li>
        <li>our accountants and professional advisers, and the police or authorities where the law requires it.</li>
      </ul>
      <p>
        Some of these companies handle data outside the UK, mainly in the European Union and the United States. Where they do, it’s protected by UK
        adequacy regulations (including the UK–US data bridge) or by the contract clauses the Information Commissioner approves.
      </p>

      <h2 id="keeping">How long we keep it</h2>
      <table>
        <caption className="sr-only">How long we keep each kind of information</caption>
        <tbody>
          <tr>
            <th scope="row">Orders</th>
            <td>Six years after the order, as tax law requires</td>
          </tr>
          <tr>
            <th scope="row">Basket reminders</th>
            <td>90 days at most; contact details removed once you order or opt out</td>
          </tr>
          <tr>
            <th scope="row">Fabric sample requests</th>
            <td>Two years</td>
          </tr>
          <tr>
            <th scope="row">Contact form messages</th>
            <td>Two years after we’ve dealt with them</td>
          </tr>
          <tr>
            <th scope="row">Newsletter</th>
            <td>Until you unsubscribe (removed the next day); unconfirmed sign-ups after 30 days</td>
          </tr>
          <tr>
            <th scope="row">Visit statistics and WhatsApp enquiry records</th>
            <td>26 months</td>
          </tr>
          <tr>
            <th scope="row">Records of the emails we send you</th>
            <td>Two years</td>
          </tr>
          <tr>
            <th scope="row">Reviews</th>
            <td>While they’re published, or until you ask us to remove them</td>
          </tr>
        </tbody>
      </table>

      <h2 id="rights">Your rights</h2>
      <p>
        You can ask for a copy of the information we hold about you, ask us to correct or delete it, ask us to limit how we use it, object to how we use it
        (including for advertising measurement and statistics), take it with you to another company, and withdraw any consent you’ve given. Email{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and we’ll reply within a month. We make no decisions about you by computer alone.
      </p>
      <p>
        If you’re unhappy with how we’ve handled your information, please tell us first. You can also complain to the Information Commissioner’s Office at{' '}
        <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a> or on 0303 123 1113.
      </p>
      <p>Our website and shop aren’t meant for children under 18.</p>

      <h2 id="changes">Changes to this notice</h2>
      <p>If we change how we use your information, we’ll update this page and the date at the top, and tell customers directly about anything significant.</p>
    </ContentPage>
  )
}
