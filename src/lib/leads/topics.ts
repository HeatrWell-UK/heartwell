// What a contact-form message is about, as the customer picks it.

export const CONTACT_TOPICS = {
  before: 'Before buying',
  order: 'An order I’ve placed',
  delivery: 'Delivery',
  after: 'After delivery',
  other: 'Something else',
} as const
export type ContactTopic = keyof typeof CONTACT_TOPICS
