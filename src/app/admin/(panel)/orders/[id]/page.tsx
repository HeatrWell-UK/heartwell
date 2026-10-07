import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, CalendarBlankIcon, EnvelopeSimpleIcon, MapPinIcon, NoteIcon, PhoneIcon, TruckIcon, WarningIcon } from '@phosphor-icons/react/ssr'
import { OrderStatusBadge, SOURCE_LABEL, Tag } from '@/components/admin/OrderBits'
import { CopyButton } from '@/components/admin/ClientButtons'
import { ActButton } from '@/components/admin/ActButton'
import { EditOrderPanel } from '@/components/admin/OrderForms'
import { getOrder, lineOption, orderPickers } from '@/lib/admin/load-orders'
import { ALLOWED_MOVES, dualTime, isStatus, NEXT_STEP, stageAheadOfStatus, STATUS_LABEL, statusMessage, whatsAppTo, type OrderStatus } from '@/lib/admin/orders'
import { toEmailData } from '@/lib/admin/order-view'
import { copyBlock } from '@/lib/email/order-emails'
import { formatPrice } from '@/lib/format'
import { formatDeliveryDate } from '@/lib/delivery/window'
import { floorName } from '@/lib/delivery/pricing'
import { SITE_URL } from '@/config/site'
import { addNote, askForReview, changeStatus, deleteTestOrder, setAttribution, setTestFlag } from '../actions'

export const metadata: Metadata = { title: 'Order' }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ moved?: string; done?: string; error?: string }> }

const ERRORS: Record<string, string> = {
  REASON_NEEDED: 'Give a reason when cancelling; it goes in the customer’s email.',
  TYPE_DELETE: 'Type DELETE to confirm.',
  NOT_A_TEST_ORDER: 'Only test orders can be deleted. Cancel a real order instead.',
  NOT_AUTHORISED: 'Please sign in again.',
  EMPTY_NOTE: 'Write the note first.',
  BAD_SOURCE: 'Choose a source from the list.',
  ORDER_CANCELLED: 'Cancelled orders can’t be changed.',
  BAD_STATUS_CHANGE: 'That status change isn’t allowed.',
}
const DONE: Record<string, string> = {
  note: 'Note added.',
  source: 'Source saved.',
  test_on: 'Marked as a test order. It won’t count anywhere.',
  test_off: 'No longer a test order.',
  created: 'Order saved.',
}
const EVENT_LABEL: Record<string, string> = {
  placed: 'Placed',
  status_changed: 'Status changed',
  details_updated: 'Details updated',
  test_flag_changed: 'Test flag changed',
  note: 'Note',
}

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const [order, pickers] = await Promise.all([getOrder(id), orderPickers()])
  if (!order) notFound()

  const status = (isStatus(order.status) ? order.status : 'pending_cod') as OrderStatus
  const next = NEXT_STEP[status]
  const links = { confirmUrl: `${SITE_URL}/confirm-order/${order.id}`, trackUrl: `${SITE_URL}/track-order` }
  const msgOrder = { reference: order.reference ?? '', customerName: order.customer_name, customerPhone: order.customer_phone, totalAmount: order.total_amount, cancellationReason: order.cancellation_reason }
  const tell = whatsAppTo(order.customer_phone, statusMessage(msgOrder, status, links))
  const ahead = stageAheadOfStatus({ status: order.status, confirmedAt: order.confirmed_at, processingAt: order.processing_at, shippedAt: order.shipped_at, deliveredAt: order.delivered_at })
  const view = toEmailData(order)
  const moved = sp.moved && isStatus(sp.moved) ? sp.moved : null

  const timeline: [string, string | null][] = [
    ['Placed', order.created_at],
    [`Confirmed${order.confirmed_by ? ` by ${order.confirmed_by === 'customer' ? 'the customer' : 'staff'}` : ''}`, order.confirmed_at],
    ['Processing', order.processing_at],
    ['On its way', order.shipped_at],
    ['Delivered', order.delivered_at],
    [`Cancelled${order.cancellation_reason ? `: ${order.cancellation_reason}` : ''}`, order.cancelled_at],
  ]
  const card = 'rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 lg:p-5'

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/orders" className="flex items-center gap-1.5 self-start text-sm font-semibold text-zinc-600">
        <ArrowLeftIcon aria-hidden="true" size={16} /> Orders
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-bold">{order.reference}</h1>
          <OrderStatusBadge status={order.status} />
          {order.source !== 'website' && <Tag tone="source">{SOURCE_LABEL[order.source] ?? order.source}</Tag>}
          {order.has_made_to_order && <Tag tone="warn">Made to order: ring to confirm</Tag>}
          {order.is_test && <Tag tone="test">Test{order.test_reason ? `: ${order.test_reason}` : ''}</Tag>}
        </div>
        <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(order.total_amount)}</p>
      </header>

      {sp.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-red-200">
          {ERRORS[sp.error] ?? `That didn’t work (${sp.error}).`}
        </p>
      )}
      {sp.done && DONE[sp.done] && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">{DONE[sp.done]}</p>}
      {moved && (
        <div className="flex flex-col gap-2 rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="text-sm font-semibold text-emerald-900">
            Marked {STATUS_LABEL[moved].toLowerCase()}.{' '}
            {['confirmed', 'shipped', 'delivered', 'cancelled'].includes(moved)
              ? order.customer_email
                ? 'The customer has been emailed.'
                : 'No email on this order, so let them know on WhatsApp.'
              : ''}
          </p>
          {tell && (
            <a href={tell} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:text-white">
              Tell {order.customer_name.split(/\s+/)[0]} on WhatsApp
            </a>
          )}
        </div>
      )}

      {ahead && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <WarningIcon aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          <span>
            <strong>Check the status.</strong> It was marked {STATUS_LABEL[ahead.status].toLowerCase()} on {dualTime(ahead.at)?.uk} UK, but now shows{' '}
            {STATUS_LABEL[status].toLowerCase()}. Use the next step below to put it right, unless moving it back was intended.
          </span>
        </p>
      )}

      <section aria-label="Next step" className={`${card} flex flex-col gap-2`}>
        {next ? (
          <form action={changeStatus}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={next.status} />
            <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 font-semibold text-white">
              {next.label} →
            </button>
          </form>
        ) : (
          <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-center text-sm font-semibold text-zinc-600">{status === 'cancelled' ? 'Cancelled: no next step.' : 'All done.'}</p>
        )}
        {status === 'pending_cod' && <p className="text-xs text-zinc-500">Usually the customer confirms from their email. Mark it confirmed yourself only if they confirmed by phone or WhatsApp.</p>}
        {tell && !moved && (
          <a href={tell} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-300">
            {status === 'pending_cod' ? 'Ask them to confirm on WhatsApp' : `WhatsApp ${order.customer_name.split(/\s+/)[0]} about this`}
          </a>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Customer" className={`${card} flex flex-col gap-2.5 text-[15px]`}>
          <p className="text-lg font-semibold">{order.customer_name}</p>
          <p className="flex items-center gap-2">
            <PhoneIcon aria-hidden="true" size={18} className="text-zinc-400" />
            <a href={`tel:${order.customer_phone.replace(/\s/g, '')}`} className="font-semibold text-zinc-900">
              {order.customer_phone}
            </a>
            {whatsAppTo(order.customer_phone) && (
              <a href={whatsAppTo(order.customer_phone)!} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-700">
                WhatsApp
              </a>
            )}
          </p>
          {order.customer_email && (
            <p className="flex items-center gap-2 break-all">
              <EnvelopeSimpleIcon aria-hidden="true" size={18} className="shrink-0 text-zinc-400" />
              <a href={`mailto:${order.customer_email}`} className="text-zinc-900">
                {order.customer_email}
              </a>
            </p>
          )}
          <p className="flex items-start gap-2">
            <MapPinIcon aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-zinc-400" />
            <span>
              {order.shipping_address}, <strong>{order.postcode}</strong>
            </span>
          </p>
          {order.preferred_delivery_date && (
            <p className="flex items-center gap-2 font-semibold">
              <CalendarBlankIcon aria-hidden="true" size={18} className="text-amber-600" />
              Wants delivery on {formatDeliveryDate(order.preferred_delivery_date)}
            </p>
          )}
          {order.special_instructions && (
            <p className="flex items-start gap-2">
              <NoteIcon aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-zinc-400" />
              {order.special_instructions}
            </p>
          )}
          {order.whatsapp_reference && <p className="text-sm text-zinc-500">WhatsApp reference {order.whatsapp_reference}</p>}
        </section>

        <section aria-label="Items and money" className={`${card} flex flex-col gap-3`}>
          <ul className="flex flex-col divide-y divide-zinc-100">
            {order.order_items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-[15px]">
                <span className="flex flex-col">
                  <span className="font-semibold">
                    {i.quantity} × {i.custom_title ?? i.title}
                  </span>
                  <span className="text-sm text-zinc-600">{lineOption(i)}</span>
                  <span className="font-mono text-xs text-zinc-500">{i.sku}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatPrice(i.unit_price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 border-t border-zinc-100 pt-2 text-sm">
            <Row label="Items" value={formatPrice(order.items_subtotal)} />
            {order.discount_amount > 0 && <Row label={`Offer${order.promotion_code ? ` ${order.promotion_code}` : ''}${order.discount_tier ? ` (${order.discount_tier})` : ''}`} value={`−${formatPrice(order.discount_amount)}`} />}
            {order.delivery_total > 0 && <Row label="Delivery extras" value={formatPrice(order.delivery_total)} />}
            <Row label="To collect on delivery" value={formatPrice(order.total_amount)} strong />
          </dl>
          {order.delivery_total > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-zinc-50 p-3 text-sm">
              <TruckIcon aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-zinc-500" />
              <ul className="flex flex-col gap-0.5">
                {order.fee_upstairs > 0 && <li>Upstairs: {order.delivery_has_lift ? `${floorName(order.delivery_floor)}, lift` : `${floorName(order.delivery_floor)}, no lift`} · {formatPrice(order.fee_upstairs)}</li>}
                {order.fee_assembly > 0 && <li>Assembly · {formatPrice(order.fee_assembly)}</li>}
                {order.removal_seats ? <li>Old sofa removal: {order.removal_seats} seats · {formatPrice(order.fee_removal)}</li> : null}
                {view.extras.some((e) => e.label === 'Delivery (agreed)') && <li>Delivery agreed with the customer</li>}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton text={copyBlock(view)} />
        <Link href={`/admin/orders/${order.id}/note`} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800">
          Delivery note
        </Link>
        {status !== 'cancelled' && (
          <EditOrderPanel
            orderId={order.id}
            variants={pickers.variants}
            fabrics={pickers.fabrics}
            initial={{
              name: order.customer_name,
              phone: order.customer_phone,
              email: order.customer_email ?? '',
              address: order.shipping_address,
              postcode: order.postcode,
              preferredDate: order.preferred_delivery_date ?? '',
              notes: order.special_instructions ?? '',
              deliveryCharge: String(order.delivery_total),
            }}
            initialLines={order.order_items.map((i) => ({ key: i.id, itemId: i.id, variantId: i.variant_id, materialId: i.material_id, quantity: i.quantity, unitPrice: String(i.unit_price) }))}
          />
        )}
      </div>

      {status === 'delivered' && (
        <section aria-labelledby="review" className={`${card} flex flex-col gap-2`}>
          <h2 id="review" className="font-semibold">
            Review
          </h2>
          <p className="text-sm text-zinc-600">
            {order.review_request_sent_at
              ? `Review email sent ${dualTime(order.review_request_sent_at)?.uk}.`
              : order.customer_email
                ? 'The review email goes automatically three days after delivery (about 10am).'
                : 'No email address, so no review email. Send the review link by WhatsApp if they’d like to leave one.'}
          </p>
          {order.customer_email && (
            <ActButton
              act={askForReview.bind(null, order.id)}
              label={order.review_request_sent_at ? 'Send it again' : 'Send the review email now'}
              confirm={order.review_request_sent_at ? 'They’ve already had one. Send another?' : undefined}
            />
          )}
          <CopyButton text={`${SITE_URL}/review/${order.review_token}`} label="Copy their review link" className="self-start" />
        </section>
      )}

      <section aria-labelledby="timeline" className={card}>
        <h2 id="timeline" className="mb-3 font-semibold">
          Timeline <span className="font-normal text-zinc-500">(UK · Pakistan)</span>
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {timeline.map(([label, at]) => {
            const t = dualTime(at)
            if (!t) return null
            return (
              <div key={label} className="text-sm">
                <dt className="font-semibold text-zinc-800">{label}</dt>
                <dd className="text-zinc-600">
                  {t.uk} UK · {t.pk} PK
                </dd>
              </div>
            )
          })}
        </dl>
      </section>

      <section aria-labelledby="history" className={card}>
        <h2 id="history" className="mb-3 font-semibold">
          History and notes
        </h2>
        <ol className="flex flex-col gap-2 text-sm">
          {order.order_events.map((e) => {
            const t = dualTime(e.at)
            return (
              <li key={e.id} className="flex flex-col border-l-2 border-zinc-200 pl-3">
                <span className="font-semibold">
                  {EVENT_LABEL[e.kind] ?? e.kind}
                  {e.kind === 'status_changed' && e.from_status && e.to_status && isStatus(e.from_status) && isStatus(e.to_status)
                    ? `: ${STATUS_LABEL[e.from_status]} → ${STATUS_LABEL[e.to_status]}`
                    : ''}
                  {e.actor ? ' (staff)' : e.kind === 'status_changed' ? ' (customer or system)' : ''}
                </span>
                {e.note && <span className="text-zinc-700">{e.note}</span>}
                {t && <span className="text-xs text-zinc-500">{t.uk} UK · {t.pk} PK</span>}
              </li>
            )
          })}
        </ol>
        <form action={addNote} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="id" value={order.id} />
          <label htmlFor="note" className="sr-only">
            Add a note
          </label>
          <input id="note" name="note" maxLength={1000} placeholder="Add a note: what was agreed, a delivery slot…" className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-3 text-[16px]" />
          <button type="submit" className="min-h-11 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">
            Add note
          </button>
        </form>
      </section>

      <section aria-labelledby="source" className={card}>
        <h2 id="source" className="mb-2 font-semibold">
          Where it came from
        </h2>
        <p className="text-sm text-zinc-600">
          {[
            order.utm_source && `Source ${order.utm_source}`,
            order.utm_campaign && `campaign ${order.utm_campaign}`,
            order.fbclid && 'Facebook click',
            order.gclid && 'Google click',
            order.whatsapp_reference && `WhatsApp ${order.whatsapp_reference}`,
          ]
            .filter(Boolean)
            .join(', ') || 'No tracking recorded (tracking arrives in Phase 14).'}
          {order.manual_acquisition_source && ` Staff say: ${order.manual_acquisition_source}${order.manual_acquisition_note ? ` (${order.manual_acquisition_note})` : ''}.`}
        </p>
        <form action={setAttribution} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="id" value={order.id} />
          <label htmlFor="src" className="sr-only">
            Source
          </label>
          <select id="src" name="source" defaultValue={order.manual_acquisition_source ?? ''} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[16px]">
            <option value="">Use the tracking</option>
            <option value="meta">Facebook or Instagram</option>
            <option value="google">Google</option>
            <option value="direct">Came straight to us</option>
            <option value="referral">Recommended by someone</option>
            <option value="other">Something else</option>
          </select>
          <label htmlFor="src-note" className="sr-only">
            Note
          </label>
          <input id="src-note" name="note" maxLength={300} defaultValue={order.manual_acquisition_note ?? ''} placeholder="How you know (optional)" className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-3 text-[16px]" />
          <button type="submit" className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold ring-1 ring-zinc-300">
            Save source
          </button>
        </form>
      </section>

      <details className={card}>
        <summary className="cursor-pointer font-semibold">Corrections, test flag and deleting</summary>
        <div className="mt-4 flex flex-col gap-5">
          {ALLOWED_MOVES[status].length > 0 && (
            <form action={changeStatus} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={order.id} />
              <label htmlFor="status" className="text-sm font-semibold">
                Change the status
              </label>
              <select id="status" name="status" defaultValue={ALLOWED_MOVES[status][0]} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[16px]">
                {ALLOWED_MOVES[status].map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <label htmlFor="reason" className="text-sm font-semibold">
                Reason (needed when cancelling; the customer sees it)
              </label>
              <input id="reason" name="reason" maxLength={300} className="min-h-11 rounded-lg border border-zinc-300 px-3 text-[16px]" />
              <button type="submit" className="min-h-11 rounded-lg bg-zinc-700 px-4 text-sm font-semibold text-white">
                Apply
              </button>
            </form>
          )}
          <form action={setTestFlag} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="isTest" value={order.is_test ? 'false' : 'true'} />
            <p className="text-sm text-zinc-600">{order.is_test ? 'This is a test order. It never counts in reports, tracking or OrderFlow.' : 'Mark as a test if this isn’t a real customer order.'}</p>
            {!order.is_test && (
              <>
                <label htmlFor="test-reason" className="sr-only">
                  Why it&rsquo;s a test
                </label>
                <input id="test-reason" name="reason" placeholder="Why (optional)" className="min-h-11 rounded-lg border border-zinc-300 px-3 text-[16px]" />
              </>
            )}
            <button type="submit" className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold ring-1 ring-zinc-300">
              {order.is_test ? 'Not a test order' : 'Mark as a test order'}
            </button>
          </form>
          {order.is_test && (
            <form action={deleteTestOrder} className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
              <input type="hidden" name="id" value={order.id} />
              <label htmlFor="confirm-delete" className="text-sm font-semibold text-red-900">
                Delete this test order for good. Type DELETE to confirm.
              </label>
              <input id="confirm-delete" name="confirm" autoComplete="off" autoCapitalize="characters" className="min-h-11 rounded-lg border border-red-300 bg-white px-3 text-[16px]" />
              <button type="submit" className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white">
                Delete test order
              </button>
            </form>
          )}
        </div>
      </details>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'text-base font-bold' : ''}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
