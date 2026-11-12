import { confirmCustomerOrder } from '@/lib/checkout/confirm'
import { buttonClasses } from '@/components/ui/Button'

export type ConfirmationQuery = { failed?: string; busy?: string }

export function ConfirmOrderForm({ id, query, fromReceipt = false }: { id: string; query: ConfirmationQuery; fromReceipt?: boolean }) {
  return (
    <form action={confirmCustomerOrder.bind(null, id, fromReceipt)} className="flex flex-col gap-3">
      {(query.failed || query.busy) && (
        <p role="alert" className="rounded-[var(--radius-field)] border border-error p-3 font-semibold text-error">
          {query.busy ? 'Please wait a minute and try again.' : 'We couldn’t confirm your order. Please try again or call us.'}
        </p>
      )}
      <button type="submit" className={buttonClasses({ variant: 'primary', block: true })}>
        Confirm my order
      </button>
    </form>
  )
}
