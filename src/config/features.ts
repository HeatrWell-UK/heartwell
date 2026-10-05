// Parts of the shop that arrive in later phases. Pages already leave room for
// them, but never send a customer to an unfinished page: each switch turns on
// in the phase that builds it.

export const FEATURES = {
  /** Checkout and placing an order (Phase 10). */
  checkout: true,
  /** Ordering fabric samples (Phase 13). */
  samples: false,
} as const
