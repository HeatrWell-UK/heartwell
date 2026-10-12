import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/content/ContentPage'
import { CONTACT } from '@/config/contact'
import { POLICIES, PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Terms of sale',
  description: 'The terms you buy from Heartwell on: ordering and confirming, prices and offers, paying on delivery, delivery, cancelling, faults and the guarantee.',
  alternates: { canonical: '/terms' },
}

const CONTENTS = [
  { id: 'us', label: '1. Who we are' },
  { id: 'ordering', label: '2. Ordering and confirming' },
  { id: 'prices', label: '3. Prices, offers and paying' },
  { id: 'delivery', label: '4. Delivery' },
  { id: 'cancelling', label: '5. Cancelling and returns' },
  { id: 'faults', label: '6. Faults and the guarantee' },
  { id: 'responsibility', label: '7. Our responsibility to you' },
  { id: 'control', label: '8. Things outside our control' },
  { id: 'other', label: '9. Reviews, your information and changes' },
  { id: 'law', label: '10. Complaints and the law' },
]

export default function TermsPage() {
  const t = CONTACT.trading
  const a = CONTACT.visitAddress
  const days = POLICIES.changeOfMindDays
  return (
    <ContentPage
      title="Terms of sale"
      intro={<p>These terms apply when you buy from us as a consumer, online, on WhatsApp or by phone. Please read them before you order.</p>}
      updated="2026-10-12"
      contents={CONTENTS}
    >
      <h2 id="us">1. Who we are</h2>
      <p>
        We are {t.companyName ? `${t.companyName}, trading as Heartwell` : 'Heartwell'}
        {t.companyNumber ? `, a company registered in England and Wales (number ${t.companyNumber})` : ''}
        {t.registeredOffice ? `, registered office ${t.registeredOffice}` : ''}
        {t.vatNumber ? `, VAT number ${t.vatNumber}` : ''}.
        {a ? ` Our address is ${a.street}, ${a.locality} ${a.postcode}.` : ''} You can reach us by email at{' '}
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        {CONTACT.phoneDisplay ? `, or by phone or WhatsApp on ${CONTACT.phoneDisplay}` : ''}.
      </p>

      <h2 id="ordering">2. Ordering and confirming</h2>
      <ol>
        <li>When you place an order, we send you a link by email and WhatsApp showing what you ordered and the total.</li>
        <li>
          Your order is accepted, and our contract with you begins, when you tap <strong>Confirm</strong> on that link (or confirm with us on WhatsApp or
          by phone) and we then book it in. Until then nothing is owed on either side.
        </li>
        <li>
          We may decline an order before we book it in, for example if a price on the site is obviously wrong, a piece is no longer available, or we can’t
          deliver to the address. We’ll tell you why, and as nothing has been paid there’s nothing to refund.
        </li>
        <li>Photos show the piece as accurately as we can, but colours vary a little between screens, and one batch of fabric can differ slightly in shade from another.</li>
      </ol>

      <h2 id="prices">3. Prices, offers and paying</h2>
      <ol>
        <li>
          Prices are in pounds and are the total you pay for each piece. Delivery to UK Mainland addresses is free; extras you choose at checkout (carrying
          upstairs, assembly, taking furniture away) are shown with their prices before you order.
        </li>
        <li>
          {PROMISES.payment.long} We don’t take card payments, deposits or any payment in advance for furniture.
        </li>
        <li>
          Offers (an offer code, or the offer for visitors from our adverts) take a fixed amount off an order, set by the pieces in it. One offer applies per
          order, it can’t be exchanged for cash, and it applies only to orders placed while it’s running (the end date is shown).
        </li>
        <li>The price you confirm is the price you pay. If our prices change after you’ve confirmed, your order isn’t affected.</li>
      </ol>

      <h2 id="delivery">4. Delivery</h2>
      <ol>
        <li>
          {PROMISES.delivery.long} {PROMISES.delivery.timingLong} These are estimates: we book the actual day with you after you confirm. Other areas are
          delivered by arrangement, with a quote first.
        </li>
        <li>
          Please check before you order that the piece will fit through your doors, hallways and stairs (see <Link href="/will-it-fit">Will it fit?</Link>
          ), and make sure someone is in on the booked day.
        </li>
        <li>
          If a booked delivery is missed because nobody is in, we charge {formatPrice(POLICIES.missedDeliveryCharge)} to deliver again. There’s no charge if
          you tell us in good time that the day no longer works.
        </li>
        <li>The furniture is your responsibility once it’s delivered, and it belongs to you once you’ve paid for it.</li>
      </ol>

      <h2 id="cancelling">5. Cancelling and returns</h2>
      <ol>
        <li>
          <strong>Ready-made pieces:</strong> you can cancel at any time before delivery, and within {days} days of delivery for any reason, under the
          Consumer Contracts Regulations. Tell us clearly (email, WhatsApp or phone), then return the piece within {days} days of telling us, at your
          cost and in the condition you received it. We refund what you paid for it within {POLICIES.refundDays} days of receiving it back, less any
          loss in value from handling it more than you’d need to in a shop. Delivery extras we’ve already carried out aren’t refunded.
        </li>
        <li>
          <strong>Made-to-order pieces</strong> are made to your choice of fabric, colour or size, so the {days}-day right to cancel doesn’t apply to them
          (regulation 28 of the Consumer Contracts Regulations). You can change or cancel one within {POLICIES.madeToOrderChangeWorkingDays} working days of
          ordering, before it goes into production. This doesn’t affect your rights if a piece is faulty.
        </li>
        <li>
          The full details, and how to tell us, are on <Link href="/delivery-and-returns">Delivery and returns</Link>.
        </li>
      </ol>

      <h2 id="faults">6. Faults and the guarantee</h2>
      <ol>
        <li>
          We must supply goods that are as described, of satisfactory quality and fit for purpose. If something isn’t, the Consumer Rights Act 2015 gives
          you the right to reject it within 30 days of delivery for a full refund, and after that to a repair or replacement (or a refund if those don’t
          work). We collect faulty items free.
        </li>
        <li>
          Please check your furniture on delivery and tell us about any transit damage within {POLICIES.damageReportHours} hours, with photos, so we can put
          it right quickly. This doesn’t limit your legal rights for faults found later.
        </li>
        <li>
          On top of your legal rights, every sofa has a {POLICIES.guaranteeYears}-year guarantee covering faults in the frame and springs. It doesn’t cover
          normal wear and tear, accidental damage, misuse, marks and stains, or fading from sunlight.
        </li>
      </ol>

      <h2 id="responsibility">7. Our responsibility to you</h2>
      <ol>
        <li>
          If we break these terms we’re responsible for loss or damage you suffer that was a foreseeable result. We’re not responsible for loss that
          wasn’t foreseeable, or for business losses: our furniture is for use in the home.
        </li>
        <li>
          When we deliver or assemble in your home, we’ll take care; if we damage your property, we’ll make good the damage we cause. Please clear the
          way and move fragile things beforehand.
        </li>
        <li>
          Nothing in these terms limits our responsibility for death or personal injury caused by our negligence, for fraud, or for anything else the law
          doesn’t allow us to limit, including your rights under the Consumer Rights Act.
        </li>
      </ol>

      <h2 id="control">8. Things outside our control</h2>
      <p>
        If something outside our reasonable control delays your order (severe weather, road closures, supplier or transport failures), we’ll tell you as soon
        as we can and keep the delay as short as possible. If it’s long, you can cancel and owe nothing.
      </p>

      <h2 id="other">9. Reviews, your information and changes</h2>
      <ol>
        <li>Reviews must be your own honest experience of something you bought from us. We may hold back reviews that are abusive or include personal details.</li>
        <li>
          How we use your information is explained in our <Link href="/privacy">privacy notice</Link>.
        </li>
        <li>We may update these terms. The terms on this page when you confirm your order are the ones that apply to it.</li>
      </ol>

      <h2 id="law">10. Complaints and the law</h2>
      <p>
        If something goes wrong, please tell us first: most problems are sorted out quickly. These terms are governed by the law of England and Wales. You
        can bring a claim in the courts of England and Wales, or, if you live in Scotland or Northern Ireland, in the courts where you live.
      </p>
    </ContentPage>
  )
}
