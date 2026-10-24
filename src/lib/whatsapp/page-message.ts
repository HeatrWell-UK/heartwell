// What the floating WhatsApp button says, page by page (owner, 24 October
// 2026). A page can set its own words (a product with the colour chosen, a
// range, a category, an order) with <WhatsAppTopic>; otherwise the address
// decides. The message is the customer's first line in the chat, so it says
// plainly what they're looking at, with the page's address where that helps.
// Pure: tested.

export interface WhatsAppTopic {
  /** The message as the customer will see it (the enquiry reference is added on tap). */
  message: string
  /** Where the tap came from, for the enquiry record: "sticky-…". */
  context: string
  productId?: string
  variantId?: string
  productName?: string
  /** False for help with an existing order: no new enquiry. */
  enquiry?: boolean
}

export interface BasketItem {
  title: string
  option: string
  quantity: number
}

const HI = 'Hi Heartwell,'

/** "2 × Ashton 3 Seater (Grey); 1 × Sims Footstool (Beige)". At most five, then "and 2 more". */
export function basketWords(items: BasketItem[]): string {
  const shown = items.slice(0, 5).map((i) => `${i.quantity} × ${i.title}${i.option ? ` (${i.option})` : ''}`)
  const more = items.length - shown.length
  return `${shown.join('; ')}${more > 0 ? `; and ${more} more` : ''}`
}

/** The floating button's message for an address, when the page hasn't set one. */
export function pageTopic(pathname: string, ctx: { siteUrl: string; basket: BasketItem[]; town: string | null }): WhatsAppTopic {
  const path = pathname.replace(/\/+$/, '') || '/'
  const url = `${ctx.siteUrl}${path}`
  const first = path.split('/')[1] ?? ''
  const topic = (message: string, context: string, enquiry = true): WhatsAppTopic => ({ message: `${HI} ${message}`, context: `sticky-${context}`, enquiry })

  if (path === '/') return topic('I have a question about your sofas.', 'home')
  if (path === '/basket' || path === '/checkout') {
    const where = path === '/checkout' ? 'checkout' : 'basket'
    return ctx.basket.length
      ? topic(`I have a question about the pieces in my ${where === 'checkout' ? 'order' : 'basket'}: ${basketWords(ctx.basket)}.`, where)
      : topic('I have a question about ordering.', where)
  }
  if (first === 'order' || first === 'confirm-order') return topic('I have a question about my order.', 'order', false)
  if (first === 'track-order') return topic('I’d like an update on my delivery.', 'track-order', false)
  if (first === 'products') return topic(`I have a question about this: ${url}`, 'product')
  if (path === '/ranges') return topic('I’d like some help choosing a sofa.', 'ranges')
  if (first === 'ranges') return topic(`I have a question about this range: ${url}`, 'range')
  if (first === 'search') return topic('I’m looking for a sofa and have a question.', 'search')
  if (first === 'saved') return topic('I have a question about the sofas I’ve saved.', 'saved')
  if (first === 'delivery-and-returns') return topic('I have a question about delivery to my postcode.', 'delivery')
  if (first === 'visit-us') return topic(`I’d like to book a visit to your showroom${ctx.town ? ` in ${ctx.town}` : ''}.`, 'visit')
  if (first === 'fabrics' || first === 'fabric-samples') return topic('I have a question about your fabrics.', 'fabrics')
  if (first === 'will-it-fit') return topic('I’d like help checking a sofa will fit.', 'will-it-fit')
  if (first === 'guides' && path !== '/guides') return topic(`I’ve been reading your guide and have a question: ${url}`, 'guide')
  if (first === 'faq') return topic('I have a question that isn’t in your FAQ.', 'faq')
  return topic('I have a question.', 'page')
}
