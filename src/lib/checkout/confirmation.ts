// How an order is confirmed (owner, 15 November 2026): in conversation, not
// with a button. After placing an order the customer taps "Ask for
// confirmation", which opens WhatsApp with the message below; the shop replies
// with the details it has (confirmRequestMessage in src/lib/email/order-emails.ts),
// the customer answers CONFIRM or says what to change, and staff mark the order
// confirmed in the admin. Until 15 November the order page had a one-tap
// Confirm button, which let people confirm without reading their own details.
// Pure, so the pages, the emails and the tests share one wording.

/** The customer's message to the shop, exactly as the owner asked for it. */
export function askForConfirmationMessage(reference: string): string {
  return `Hello Heartwell, I have placed an order (${reference}). Can you share my details so I can confirm the order?`
}
