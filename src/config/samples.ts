// Fabric samples: a few fabrics posted to the customer, £5 for the set, and
// the £5 comes off their sofa if they buy. Nothing is paid on the website
// (there are no card payments anywhere): the request books a call or WhatsApp
// to settle the £5, and the samples go in the post once it's paid. That also
// keeps the drawer from being emptied by collectors.
//
// How many fabrics per request is a shop setting (shop_settings.sample_limit,
// default 5), enforced by the database; the fee is set here.

export const SAMPLES = {
  /** Pounds, for the whole set. */
  feeGbp: 5,
  fee: '£5',
  /** Where samples are ordered. */
  href: '/fabric-samples',
} as const
