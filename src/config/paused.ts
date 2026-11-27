// Services paused for the busy season (owner, 27 November 2026). The options
// stay on the site; choosing one shows a short apology instead. Set a switch
// back to false to offer the service again.

export const PAUSED = {
  /** Taking the old sofa away at checkout. */
  removal: true,
  /** Posting fabric samples. */
  samples: true,
} as const

export const PAUSED_TEXT = {
  removal:
    'Sorry, we can’t take old sofas away at the moment. It’s our busiest time of year and every van is full with deliveries. Nothing has been added to your order.',
  samples:
    'Sorry, we aren’t posting fabric samples at the moment. It’s our busiest time of year and we’re busy making and delivering sofas. You’re welcome to see every fabric at our showroom, or send us a WhatsApp and we’ll send you close-up photos.',
} as const
