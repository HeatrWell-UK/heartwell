// Every promise the storefront makes, in one place. Change it here and it
// changes everywhere: pages, metadata, emails and the chat assistant. Prices
// for delivery extras live in the shop_settings table, not here.

export const PROMISES = {
  delivery: {
    label: 'Free delivery',
    sub: 'UK Mainland',
    short: 'Free UK Mainland delivery',
    long: 'Free delivery to UK Mainland addresses, brought to the ground floor or a ground-floor room of your choice.',
    timingShort: '2–4 working days',
    timingSub: 'Most postcodes',
    timingLong:
      'Most UK Mainland orders arrive in 2 to 4 working days. Some postcodes in the Scottish Highlands and the far south-west of England take 5 to 7 working days. We deliver seven days a week.',
  },
  payment: {
    label: 'Pay on delivery',
    sub: 'Cash or transfer',
    short: 'Pay nothing until it arrives',
    long: 'Pay the driver in cash or by bank transfer once your furniture is in your room. Nothing to pay upfront.',
  },
  guarantee: {
    label: '1-year guarantee',
    sub: 'Frame and springs',
    short: '1-year frame and springs guarantee',
    long: 'Every sofa carries a 1-year guarantee covering structural faults in the frame and springs.',
  },
  returns: {
    label: '14 days to change your mind',
    sub: 'Ready-made pieces',
    short: '14 days to change your mind on ready-made pieces',
    long: 'You have 14 days from delivery to change your mind on ready-made pieces, under the Consumer Contracts Regulations. Made-to-order pieces are built for you, so they are exempt; faults are always covered.',
  },
  madeToOrder: {
    label: 'Made to order',
    sub: 'Your fabric and size',
    short: 'Fabric sofas made to order',
    long: 'Our fabric sofas are made to order in the UK, in the colour shown or any of our fabrics.',
  },
} as const

/**
 * The figures behind Delivery & returns, the FAQ and the terms. Prices for
 * delivery extras live in shop_settings; these are the rules around them.
 * Change one here and every page that states it changes with it.
 */
export const POLICIES = {
  /** Days from delivery to cancel a ready-made piece for any reason (Consumer Contracts Regulations). */
  changeOfMindDays: 14,
  /** Days to refund once a cancelled piece is back with us. */
  refundDays: 14,
  /** Working days after ordering to change or cancel a made-to-order piece, before it's made. */
  madeToOrderChangeWorkingDays: 2,
  /** Hours after delivery to tell us about transit damage, with photos. */
  damageReportHours: 24,
  /** Charged when a booked delivery is missed and the trip has to be made again. */
  missedDeliveryCharge: 50,
  /** Frame and springs guarantee, in years. */
  guaranteeYears: 1,
} as const

/** The one sentence in the bar at the top of every page. */
export const ANNOUNCEMENT = 'Free UK Mainland delivery. Pay nothing until it arrives.'

/** Default meta description. */
export const META_DESCRIPTION =
  'Sofas made to order with free UK Mainland delivery. Pay nothing until it arrives: cash or bank transfer on delivery. 1-year frame guarantee.'
