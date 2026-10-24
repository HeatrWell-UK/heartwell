import { describe, expect, it } from 'vitest'
import { basketWords, pageTopic } from '@/lib/whatsapp/page-message'
import { CONTACT, whatsAppHref } from '@/config/contact'

const ctx = { siteUrl: 'https://heartwellsofa.co.uk', basket: [], town: 'Burnley' }

describe('floating WhatsApp button', () => {
  it('uses the shop’s new number', () => {
    expect(CONTACT.whatsAppNumber).toBe('447460669864')
    expect(CONTACT.phoneDisplay).toBe('07460 669864')
    expect(CONTACT.phoneE164).toBe('+447460669864')
    expect(whatsAppHref('Hi')).toBe('https://wa.me/447460669864?text=Hi')
  })

  it('says what the customer is looking at, page by page', () => {
    expect(pageTopic('/', ctx)).toEqual({ message: 'Hi Heartwell, I have a question about your sofas.', context: 'sticky-home', enquiry: true })
    expect(pageTopic('/products/ashton-3-seater', ctx).message).toBe('Hi Heartwell, I have a question about this: https://heartwellsofa.co.uk/products/ashton-3-seater')
    expect(pageTopic('/ranges/verona/', ctx).message).toBe('Hi Heartwell, I have a question about this range: https://heartwellsofa.co.uk/ranges/verona')
    expect(pageTopic('/visit-us', ctx).message).toBe('Hi Heartwell, I’d like to book a visit to your showroom in Burnley.')
    expect(pageTopic('/guides/high-back-or-scatter-back', ctx).context).toBe('sticky-guide')
    expect(pageTopic('/guides', ctx).context).toBe('sticky-page')
    expect(pageTopic('/terms', ctx)).toMatchObject({ message: 'Hi Heartwell, I have a question.', context: 'sticky-page' })
  })

  it('lists the basket’s pieces in the basket and at checkout', () => {
    const basket = [
      { title: 'Ashton 3 Seater', option: 'Grey', quantity: 1 },
      { title: 'Sims Footstool', option: 'Beige', quantity: 2 },
    ]
    expect(pageTopic('/basket', { ...ctx, basket }).message).toBe('Hi Heartwell, I have a question about the pieces in my basket: 1 × Ashton 3 Seater (Grey); 2 × Sims Footstool (Beige).')
    expect(pageTopic('/checkout', { ...ctx, basket }).message).toMatch(/^Hi Heartwell, I have a question about the pieces in my order: 1 × Ashton/)
    expect(pageTopic('/basket', ctx).message).toBe('Hi Heartwell, I have a question about ordering.')
    const many = Array.from({ length: 7 }, (_, i) => ({ title: `Piece ${i + 1}`, option: '', quantity: 1 }))
    expect(basketWords(many)).toBe('1 × Piece 1; 1 × Piece 2; 1 × Piece 3; 1 × Piece 4; 1 × Piece 5; and 2 more')
  })

  it('never starts a new enquiry for an existing order', () => {
    expect(pageTopic('/order/7c2a1e7e-0000-4000-8000-000000000001', ctx)).toMatchObject({ context: 'sticky-order', enquiry: false })
    expect(pageTopic('/confirm-order/7c2a1e7e-0000-4000-8000-000000000001', ctx).enquiry).toBe(false)
    expect(pageTopic('/track-order', ctx).enquiry).toBe(false)
    // No order IDs in the message: the order's own page sets its reference instead.
    expect(pageTopic('/order/7c2a1e7e-0000-4000-8000-000000000001', ctx).message).not.toMatch(/7c2a1e7e/)
  })

  it('gives contexts the enquiry record accepts', () => {
    const paths = ['/', '/basket', '/checkout', '/order/x', '/track-order', '/products/x', '/ranges', '/ranges/x', '/search', '/saved', '/delivery-and-returns', '/visit-us', '/fabrics', '/will-it-fit', '/guides/x', '/faq', '/about']
    for (const p of paths) expect(pageTopic(p, ctx).context).toMatch(/^[a-z][a-z0-9-]{1,40}$/)
  })
})
