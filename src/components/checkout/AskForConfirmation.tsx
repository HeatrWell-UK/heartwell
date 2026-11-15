import { buttonClasses } from '@/components/ui/Button'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph'
import { CONTACT } from '@/config/contact'
import { askForConfirmationMessage } from '@/lib/checkout/confirmation'

/**
 * The one thing to do after placing an order (owner, 15 November 2026): open
 * WhatsApp with the owner's message and the order number, so the shop sends
 * the details back and the customer confirms in reply. On the order page and
 * the confirm page (the email link). There is no confirm button any more.
 */
export function AskForConfirmation({ reference }: { reference: string }) {
  return (
    <div className="flex flex-col gap-3">
      <WhatsAppButton message={askForConfirmationMessage(reference)} context="order-ask-confirmation" enquiry={false} className={buttonClasses({ variant: 'primary', block: true })}>
        <WhatsAppGlyph />
        Ask for confirmation on WhatsApp
      </WhatsAppButton>
      <p className="text-[14px] leading-snug text-slate">
        Opens WhatsApp with your order number. We reply with your details; check them and reply <strong className="font-semibold">Confirm</strong>. No
        WhatsApp? Ring us{CONTACT.phoneDisplay ? ` on ${CONTACT.phoneDisplay}` : ''} or reply to your order email.
      </p>
    </div>
  )
}
