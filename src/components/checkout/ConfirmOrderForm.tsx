import { confirmCustomerOrder } from '@/lib/checkout/confirm'
import { buttonClasses } from '@/components/ui/Button'

export type ConfirmationQuery = { failed?: string; busy?: string }

/**
 * The Confirm button on the confirm page, which the customer reaches from the
 * link in the shop's WhatsApp message (owner, 15 November 2026): they see every
 * detail first, then press. It is not on the screen straight after checkout.
 */
export function ConfirmOrderForm({ id, query }: { id: string; query: ConfirmationQuery }) {
  return (
    <form action={confirmCustomerOrder.bind(null, id)} className="flex flex-col gap-3">
      {(query.failed || query.busy) && (
        <p role="alert" className="rounded-[var(--radius-field)] border border-error p-3 font-semibold text-error">
          {query.busy ? 'Please wait a minute and try again.' : 'We couldn’t confirm your order. Please try again or call us.'}
        </p>
      )}
      <button type="submit" className={buttonClasses({ variant: 'primary', block: true })}>
        Yes, these details are right: confirm my order
      </button>
    </form>
  )
}
