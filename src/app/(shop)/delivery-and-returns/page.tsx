import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage, Note } from '@/components/content/ContentPage'
import { BritainMap } from '@/components/content/BritainMap'
import { CONTACT } from '@/config/contact'
import { POLICIES, PROMISES } from '@/config/promises'
import { formatPrice } from '@/lib/format'
import { getCheckoutSettings } from '@/lib/product/load'
import { SUPABASE_CONFIGURED } from '@/lib/supabase/config'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Sofa delivery and returns: times, costs and areas',
  description: `${PROMISES.delivery.short}, ${PROMISES.delivery.timingShort.toLowerCase()} for most postcodes. Pay on delivery. Where it costs extra, damage and changing your mind.`,
  alternates: { canonical: '/delivery-and-returns' },
}

const CONTENTS = [
  { id: 'delivery', label: 'Getting it to you' },
  { id: 'areas', label: 'Where delivery costs extra' },
  { id: 'charges', label: 'What extras cost' },
  { id: 'elsewhere', label: 'Outside UK Mainland' },
  { id: 'paying', label: 'Paying on delivery' },
  { id: 'damaged', label: 'If something arrives damaged' },
  { id: 'changes', label: 'Changes and cancellations before delivery' },
  { id: 'returns', label: 'Changing your mind after delivery' },
  { id: 'made-to-order', label: 'Bespoke orders' },
  { id: 'faults', label: 'Faults and the guarantee' },
]

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`

export default async function DeliveryAndReturnsPage() {
  const settings = SUPABASE_CONFIGURED ? await getCheckoutSettings().catch(() => null) : null
  const d = settings?.delivery
  const areas = settings?.areas ?? []
  const days = POLICIES.changeOfMindDays
  const cancellationEmail = 'mailto:' + CONTACT.email + '?' + new URLSearchParams({
    subject: 'Cancel my Heartwell order',
    body: 'I wish to cancel my order for:\nOrder reference:\nDate ordered or delivered:\nName:\nAddress:\nDate:',
  }).toString().replaceAll('+', '%20')

  return (
    <ContentPage
      title="Delivery and returns"
      intro={
        <p>
          Free delivery to most of mainland Britain, nothing to pay until your furniture is in your room, and plain rules if anything goes wrong.
        </p>
      }
      updated="2026-11-13"
      contents={CONTENTS}
      figure={
        <div className="hw-panel flex items-center gap-5 px-5 py-6 sm:gap-8 sm:px-8">
          <BritainMap className="w-[34%] max-w-[150px] shrink-0" showroom={false} />
          <ul className="flex flex-col gap-3 text-[15px] leading-snug sm:text-base">
            <li>
              <strong className="font-semibold">{PROMISES.delivery.short}</strong>, into the room of your choice on the ground floor.
            </li>
            <li>
              <strong className="font-semibold">Usually {PROMISES.delivery.timingShort}</strong>{settings ? `: order today and most arrive ${settings.windowLabel}.` : '.'}
            </li>
            {areas.length > 0 && (
              <li>
                <strong className="font-semibold">{PROMISES.delivery.chargedAreas}</strong>: a delivery charge and {PROMISES.delivery.chargedTiming},{' '}
                <a href="#areas">see below</a>.
              </li>
            )}
            <li>
              <strong className="font-semibold">Northern Ireland and the islands</strong> by arrangement: <a href="#elsewhere">see below</a>.
            </li>
          </ul>
        </div>
      }
    >
      <h2 id="delivery">Getting it to you</h2>
      <p>{PROMISES.delivery.long} There’s no minimum order.</p>
      <p>
        {PROMISES.delivery.timingLong}
        {settings ? ` Order today and most arrive ${settings.windowLabel}.` : ''} Once your order is confirmed we ring or WhatsApp you to book the day, and
        you can choose a preferred day at checkout.
      </p>
      <p>
        Before the day, measure the narrowest door, hallway and turn on the way in, and make sure there’s somewhere for the van to stop. If you’re
        not sure it will fit, <Link href="/will-it-fit">check before you order</Link> or ask us: it’s much easier to sort out beforehand than on the day.
      </p>

      {areas.length > 0 && (
        <>
          <h2 id="areas">Where delivery costs extra</h2>
          <p>
            Delivery is free everywhere else on the mainland. These areas are further from us, so delivery there has a charge and takes a little longer. The
            charge is added as soon as you enter your postcode, before you order, and it’s paid with everything else on delivery.
          </p>
          <table>
            <caption className="sr-only">Areas with a delivery charge</caption>
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Charge</th>
                <th scope="col">Delivery time</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.slug}>
                  <th scope="row">
                    {a.name}
                    {a.places && <span className="block text-sm font-normal text-slate">{a.places}</span>}
                  </th>
                  <td>{formatPrice(a.charge)}</td>
                  <td>
                    {a.minWorkingDays} to {a.maxWorkingDays} working days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Not sure which side of a line you’re on? Enter your postcode on any product page and it tells you the price and delivery time straight away.
          </p>
        </>
      )}

      <h2 id="charges">What extras cost</h2>
      <p>Choose any of these at checkout. They’re paid with your order on delivery, never in advance.</p>
      <table>
        <caption className="sr-only">Delivery and extras, all paid on delivery</caption>
        <tbody>
          <tr>
            <th scope="row">Delivery to the ground floor</th>
            <td>{areas.length > 0 ? <>Free for most postcodes (<a href="#areas">areas with a charge</a>)</> : 'Free'}</td>
          </tr>
          {d && (
            <>
              <tr>
                <th scope="row">Carrying upstairs</th>
                <td>
                  {formatPrice(d.upstairs_first_floor)} for the 1st floor, or any floor with a lift; {formatPrice(d.upstairs_per_extra_floor)} for each floor above that
                  without a lift (up to the {ordinal(d.max_floor)} floor)
                </td>
              </tr>
              <tr>
                <th scope="row">Assembly in your room</th>
                <td>{formatPrice(d.assembly_fee)}</td>
              </tr>
              <tr>
                <th scope="row">Taking your old furniture away</th>
                <td>{formatPrice(d.removal_per_seat)} a seat</td>
              </tr>
            </>
          )}
          <tr>
            <th scope="row">Re-delivery after a missed delivery</th>
            <td>{formatPrice(POLICIES.missedDeliveryCharge)}</td>
          </tr>
        </tbody>
      </table>
      <Note title="If you can’t be in">
        Tell us as early as you can and we’ll move your delivery to another day, free. If nobody is in when the driver arrives on the booked day, the trip has
        to be made again, so the {formatPrice(POLICIES.missedDeliveryCharge)} re-delivery charge applies.
      </Note>

      <h2 id="elsewhere">Outside UK Mainland</h2>
      <p>
        We deliver to Northern Ireland, the Isle of Man, the Channel Islands, the Isle of Wight, the Scottish islands and the Isles of Scilly by arrangement.
        Enter your postcode on any product page or at checkout and we’ll tell you straight away; then we quote on WhatsApp before anything is booked.
      </p>

      <h2 id="paying">Paying on delivery</h2>
      <p>
        {PROMISES.payment.long} Have a good look at your furniture before you pay: if something isn’t right, say so there and then, and we’ll sort it out
        before you hand over any money.
      </p>

      <h2 id="damaged">If something arrives damaged</h2>
      <p>
        Most problems are spotted on the doorstep, before you pay. If you notice damage later, send us photos within {POLICIES.damageReportHours} hours of
        delivery, by WhatsApp or to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>, with your order number. We’ll repair it, replace the damaged
        part or piece, or refund you, and if it has to come back we collect it free.
      </p>

      <h2 id="changes">Changes and cancellations before delivery</h2>
      <ul>
        <li>
          <strong>Standard catalogue orders:</strong> you can cancel before delivery, including orders in a colour or fabric we offer.
        </li>
        <li>
          <strong>Bespoke orders:</strong> tell us within {POLICIES.madeToOrderChangeWorkingDays} working days of ordering, before your piece goes
          into production.
        </li>
      </ul>
      <p>Email or WhatsApp us with your order number and what you’d like to change.</p>

      <h2 id="returns">Changing your mind after delivery</h2>
      <p>
        For standard catalogue orders you have {days} days from delivery to tell us you want to cancel. This includes sofas made to order in our standard colours, fabrics or sizes. Tell us by email, WhatsApp or phone that you want to cancel. You can use our
        <a className="ml-1" href={cancellationEmail}>cancellation email template</a> or send your own message.
      </p>
      <ol>
        <li>Send it back within {days} days of telling us. Contact us before ordering for the estimated transport cost for your sofa and postcode. You pay the direct return cost if we gave you the required cost information before you ordered. Where we didn’t, we cover the direct return cost.</li>
        <li>Send it back in the condition it reached you, wrapped to protect it. You can look at and try it as you would in a shop; if it comes back worn or damaged we may take the loss in value off your refund.</li>
        <li>
          We refund the price and the cost of standard outbound delivery within {POLICIES.refundDays} days of receiving the furniture or your proof of return, whichever comes first. Any deduction or exclusion will follow your statutory rights.
        </li>
      </ol>

      <h2 id="made-to-order">Bespoke orders</h2>
      <p>
        The change-of-mind right may not apply to furniture made to your own specifications, such as a sofa built to a custom width outside our catalogue.
        We explain any exception before you agree to a bespoke order. Your rights for faulty goods still apply.
      </p>
      <p>You can <Link href="/fabric-samples">order fabric samples</Link> before choosing a fabric.</p>
      <h2 id="faults">Faults and the guarantee</h2>
      <p>
        If something is faulty, the Consumer Rights Act protects you: within 30 days of delivery you can reject it for a full refund, and after that we’ll
        repair or replace it, or refund you if that doesn’t work. We collect faulty items free.
      </p>
      <p>
        On top of that, every sofa has a {POLICIES.guaranteeYears}-year guarantee on the frame and foam. It doesn’t cover normal wear, accidental damage,
        marks and stains, or fading from sunlight. See the <Link href="/care-guide">care guide</Link> to keep it looking its best.
      </p>
      <p>
        Questions? <Link href="/contact">Get in touch</Link>.
      </p>
    </ContentPage>
  )
}
